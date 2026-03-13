const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

async function check() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/eagri_platform';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);

        console.log('\n===== ALL FARMERS =====');
        const farmers = await User.find({ role: 'farmer' });
        farmers.forEach(f => {
            const loc = [f.address?.city, f.address?.state].filter(Boolean).join(', ');
            console.log(`  ID: ${f._id}  |  Name: ${f.name}  |  Location: ${loc || 'N/A'}`);
        });

        console.log('\n===== ALL PRODUCTS =====');
        const products = await Product.find().populate('farmer', 'name address');
        console.log('Total:', products.length);
        products.forEach((p, idx) => {
            const farmerObj = p.farmer && typeof p.farmer === 'object' ? p.farmer : null;
            const farmerId = farmerObj ? farmerObj._id : (p.farmer || 'MISSING');
            const farmerName = farmerObj ? farmerObj.name : (p.farmerName || 'MISSING');
            const loc = farmerObj?.address
                ? [farmerObj.address.city, farmerObj.address.state].filter(Boolean).join(', ')
                : p.farmingDetails?.location || 'N/A';
            const linked = farmerObj ? '✅ LINKED' : '❌ NOT LINKED';
            console.log(`\n${idx + 1}. "${p.name}"`);
            console.log(`   Product ID: ${p._id}`);
            console.log(`   Category: ${p.category}  |  Price: ₹${p.price}  |  Stock: ${p.stock}`);
            console.log(`   FarmerID (farmer field): ${farmerId}`);
            console.log(`   FarmerName (farmerName field): ${p.farmerName || 'N/A'}`);
            console.log(`   Populated Farmer Name: ${farmerName}`);
            console.log(`   Location: ${loc}`);
            console.log(`   Status: ${linked}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
