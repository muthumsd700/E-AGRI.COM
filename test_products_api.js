const http = require('http');

http.get('http://localhost:5000/api/products', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const products = JSON.parse(data);
            console.log('Total Products:', products.length);
            products.slice(0, 2).forEach(p => {
                console.log(`Name: ${p.name}, Farmer: ${p.farmer?.name}, Address: ${JSON.stringify(p.farmer?.address)}`);
            });
        } catch (e) {
            console.log('Error parsing JSON:', e.message);
        }
        process.exit(0);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
