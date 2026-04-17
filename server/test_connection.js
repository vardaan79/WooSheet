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
    console.log('Testing WooCommerce API Connection (with WWW)...');
    console.log('Base URL:', WC_BASE);

    try {
        const start = Date.now();
        const response = await axios.get(wcUrl('/orders'), { 
            params: { ...wcParams, per_page: 1 }, 
            timeout: 20000 
        });
        console.log(`✅ Connection Successful in ${Date.now() - start}ms`);
        console.log('Status Code:', response.status);
        console.log('Total Orders:', response.headers['x-wp-total']);
    } catch (err) {
        console.error('❌ Connection Failed!');
        console.error('Error Message:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

test();
