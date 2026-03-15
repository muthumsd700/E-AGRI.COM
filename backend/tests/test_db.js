const mongoose = require('mongoose');

async function verifyDB() {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eagri_platform';
        require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        // Dynamically require models from correct relative path
        const User = require('../models/User');
        const users = await User.find({});
        console.log('--- Users in Database ---');
        if (users.length === 0) {
            console.log('No users found in database yet.');
        } else {
            users.forEach(u => {
                console.log(`- ${u.name} (${u.email}) [Role: ${u.role}, Phone: ${u.phone || 'N/A'}]`);
            });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

verifyDB();
