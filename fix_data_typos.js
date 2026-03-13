const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const Product = require('./backend/models/Product');

async function fix() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/eagri_platform';
        await mongoose.connect(uri);
        
        // Fix "vegtable" -> "Vegetable"
        const result1 = await Product.updateMany(
            { category: /vegtable/i },
            { $set: { category: 'Vegetable' } }
        );
        console.log('Updated vegtable:', result1.modifiedCount);
        
        // Fix "Tomatomes" -> "Tomatoes" (Optional but good)
        const result2 = await Product.updateMany(
            { name: /Tomatomes/i },
            { $set: { name: 'Tomatoes' } }
        );
        console.log('Updated Tomatomes:', result2.modifiedCount);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
