const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

async function check() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/eagri_platform';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        
        const products = await Product.find().populate('farmer', 'name email');
        console.log('Total Products:', products.length);
        products.forEach((p, idx) => {
            console.log(`${idx + 1}. Name: ${p.name}, Cat: ${p.category}, Price: ₹${p.price}, Farmer: ${p.farmerName}, Reviews: ${p.reviews?.length||0}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
