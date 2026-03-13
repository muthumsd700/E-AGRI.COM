const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./backend/models/User');

async function check() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/eagri_platform';
        await mongoose.connect(uri);
        
        const users = await User.find({ role: 'farmer' });
        users.forEach(u => {
            console.log(`Farmer: ${u.name}, Address: ${JSON.stringify(u.address)}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
