const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb://localhost:27017/eagri_platform';

async function verifyDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const users = await User.find({});
        console.log('--- Users in Database ---');
        if (users.length === 0) {
            console.log('No users found in database yet.');
        } else {
            users.forEach(u => {
                console.log(`- ${u.name} (${u.email}) [Role: ${u.role}, Phone: ${u.phone}]`);
            });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyDB();
