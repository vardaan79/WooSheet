import axios from 'axios';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const WC_BASE = process.env.WC_BASE_URL || 'https://aquaticaindia.com';

async function test() {
    console.log('Testing general connection to:', WC_BASE);
    try {
        const start = Date.now();
        const response = await axios.get(WC_BASE, { timeout: 15000 });
        console.log(`✅ Fetched homepage in ${Date.now() - start}ms`);
    } catch (err) {
        console.error('❌ Homepage fetch failed:', err.message);
    }

    console.log('\nTesting REST API index...');
    try {
        const start = Date.now();
        const response = await axios.get(`${WC_BASE}/wp-json`, { timeout: 15000 });
        console.log(`✅ Fetched WP-JSON index in ${Date.now() - start}ms`);
    } catch (err) {
        console.error('❌ WP-JSON index fetch failed:', err.message);
    }
}

test();
