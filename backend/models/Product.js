const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmerName: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        default: 0,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    image: {
        type: String, // Can store base64 string or URL
        trim: true
    },
    location: {
        type: String,
        trim: true,
        default: ''
    }
}, { 
    timestamps: true, // Automatically manages createdAt and updatedAt
    collection: 'products' // Ensure it saves to 'products' collection
});

module.exports = mongoose.model('Product', ProductSchema);