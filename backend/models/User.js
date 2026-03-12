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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
