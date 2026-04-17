import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

// Simple in-memory cache
const cache = {
    stats: { data: null, timestamp: 0 },
    orders: new Map(), // key: stringified params, value: { data, timestamp }
};

const CACHE_TTL = {
    stats: 5 * 60 * 1000, // 5 minutes (increased from 1m)
    orders: 30 * 1000, // 30 seconds
};

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const WC_BASE = process.env.WC_BASE_URL || 'https://aquaticaindia.com';
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;

const keysConfigured = WC_KEY && !WC_KEY.includes('YOUR_CONSUMER_KEY');
if (!keysConfigured) {
    console.warn('\n⚠️  WARNING: WooCommerce API keys not configured!');
    console.warn('   Edit server/.env and add your Consumer Key and Secret.\n');
} else {
    console.log(`✅ API keys loaded (${WC_KEY.substring(0, 12)}...)`);
}

// WooCommerce API always passes credentials as query params — more compatible
// than Basic Auth header which some hosts/security plugins strip.
const wcParams = () => ({
    consumer_key: WC_KEY,
    consumer_secret: WC_SECRET,
});

const wcUrl = (path) => `${WC_BASE}/wp-json/wc/v3${path}`;

// ─── GET /api/orders ─────────────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
    try {
        const { status = 'any', search = '', page = 1, per_page = 10, refresh = 'false' } = req.query;
        const cacheKey = JSON.stringify({ status, search, page, per_page });
        const now = Date.now();

        if (refresh !== 'true' && cache.orders.has(cacheKey)) {
            const entry = cache.orders.get(cacheKey);
            if (now - entry.timestamp < CACHE_TTL.orders) {
                return res.json(entry.data);
            }
        }

        const params = { 
            ...wcParams(), 
            page, 
            per_page, 
            orderby: 'date', 
            order: 'desc',
            _fields: 'id,status,billing,date_created,line_items,total' 
        };
        if (status !== 'any') params.status = status;
        if (search) params.search = search;

        const response = await axios.get(wcUrl('/orders'), { params, timeout: 90000 });

        const total = parseInt(response.headers['x-wp-total']) || 0;
        const totalPages = parseInt(response.headers['x-wp-totalpages']) || 1;
        const result = { orders: response.data, total, totalPages };

        // Save to cache
        cache.orders.set(cacheKey, { data: result, timestamp: now });

        res.json(result);
    } catch (err) {
        console.error('GET /api/orders error:', err.message);
        res.status(err.response?.status || 500).json({
            error: err.message,
            details: err.response?.data,
        });
    }
});

// ─── GET /api/orders/:id ─────────────────────────────────────────────────────
app.get('/api/orders/:id', async (req, res) => {
    try {
        const response = await axios.get(wcUrl(`/orders/${req.params.id}`), {
            params: wcParams(),
            timeout: 15000,
        });
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json({ error: err.message });
    }
});

// ─── PUT /api/orders/:id ─────────────────────────────────────────────────────
app.put('/api/orders/:id', async (req, res) => {
    try {
        const response = await axios.put(
            wcUrl(`/orders/${req.params.id}`),
            req.body,
            { params: wcParams(), timeout: 15000 }
        );
        res.json(response.data);
    } catch (err) {
        console.error(`PUT /api/orders/${req.params.id} error:`, err.message);
        res.status(err.response?.status || 500).json({
            error: err.message,
            details: err.response?.data,
        });
    }
});

// ─── GET /api/stats ──────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        const { refresh = 'false' } = req.query;
        const now = Date.now();

        if (refresh !== 'true' && cache.stats.data && (now - cache.stats.timestamp < CACHE_TTL.stats)) {
            return res.json(cache.stats.data);
        }

        const statuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
        const counts = [];
        for (const s of statuses) {
            try {
                const start = Date.now();
                const r = await axios.get(wcUrl('/orders'), {
                    params: { ...wcParams(), status: s, per_page: 1, _fields: 'id' },
                    timeout: 25000,
                });
                counts.push({ status: s, count: parseInt(r.headers['x-wp-total']) || 0 });
                console.log(`[Stats] Cached ${s} in ${Date.now() - start}ms`);
                await new Promise(res => setTimeout(res, 300));
            } catch (err) {
                console.warn(`[Stats] Failed for ${s}:`, err.message);
                const oldVal = cache.stats.data?.byStatus?.[s] || 0;
                counts.push({ status: s, count: oldVal });
            }
        }
        const total = counts.reduce((sum, c) => sum + c.count, 0);
        const result = { total, byStatus: Object.fromEntries(counts.map(c => [c.status, c.count])) };

        // Save to cache
        cache.stats.data = result;
        cache.stats.timestamp = now;

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── SERVE FRONTEND (PRODUCTION) ─────────────────────────────────────────────
// Serve static files from the React app build directory
app.use(express.static(join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 WooSheet proxy server running on http://0.0.0.0:${PORT}`);
    console.log(`   Connected to: ${WC_BASE}\n`);
});
