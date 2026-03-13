const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    houseStreet: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' }
}, { _id: false });

const AddressItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    fullName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    addressLine: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['farmer', 'consumer'],
        default: 'consumer'
    },
    phone: {
        type: String,
        trim: true
    },
    experience: {
        type: String,
        trim: true,
        default: ''
    },
    farmSize: {
        type: String,
        trim: true,
        default: ''
    },
    address: {
        type: AddressSchema,
        default: () => ({})
    },
    addresses: {
        type: [AddressItemSchema],
        default: []
    },
    defaultAddressId: {
        type: String,
        default: ''
    },
    profilePhoto: {
        type: String,
        default: ''
    },
    wishlist: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        twoFAEnabled: { type: Boolean, default: false },
        notifications: {
            email: { type: Boolean, default: true },
            orders: { type: Boolean, default: true },
            promos: { type: Boolean, default: false },
            delivery: { type: Boolean, default: true }
        },
        privacy: {
            visibility: { type: String, default: 'public' },
            allowContact: { type: Boolean, default: true },
            allowRecommendations: { type: Boolean, default: true }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
