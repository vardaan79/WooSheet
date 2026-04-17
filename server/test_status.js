import axios from 'axios';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const WC_BASE = process.env.WC_BASE_URL || 'https://www.aquaticaindia.com';
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;

const wcUrl = (path) => `${WC_BASE}/wp-json/wc/v3${path}`;
const wcParams = {
    consumer_key: WC_KEY,
    consumer_secret: WC_SECRET,
};

async function test() {
    console.log('Testing WooCommerce API with Status Filter...');
    
    const statuses = ['any', 'pending', 'processing', 'completed'];
    
    for (const s of statuses) {
        console.log(`\nFetching status: ${s}...`);
        try {
            const start = Date.now();
            const params = { ...wcParams, per_page: 1 };
            if (s !== 'any') params.status = s;
            
            const response = await axios.get(wcUrl('/orders'), { 
                params, 
                timeout: 30000 
            });
            console.log(`✅ ${s} fetched in ${Date.now() - start}ms. Count: ${response.headers['x-wp-total']}`);
        } catch (err) {
            console.error(`❌ ${s} failed: ${err.message}`);
        }
    }
}

test();
