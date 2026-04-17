import axios from 'axios';

async function testPerformance() {
    console.log('Testing Optimized API Performance...');
    
    try {
        console.log('\nFetching Stats...');
        const startStats = Date.now();
        const statsRes = await axios.get('http://localhost:3001/api/stats');
        console.log(`✅ Stats fetched in ${Date.now() - startStats}ms`);
        console.log('Stats Data:', JSON.stringify(statsRes.data));

        console.log('\nFetching Orders (Optimized)...');
        const startOrders = Date.now();
        const ordersRes = await axios.get('http://localhost:3001/api/orders');
        console.log(`✅ Orders fetched in ${Date.now() - startOrders}ms`);
        console.log(`Total Orders: ${ordersRes.data.total}`);
        console.log(`Orders on Page: ${ordersRes.data.orders.length}`);
        
        // Check size of response
        const size = JSON.stringify(ordersRes.data).length;
        console.log(`Payload Size: ${(size / 1024).toFixed(2)} KB`);

    } catch (err) {
        console.error('❌ Test Failed:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data);
        }
    }
}

testPerformance();
