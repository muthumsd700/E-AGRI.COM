const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_for_eagri_platform';

const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, phone, address, addresses, defaultAddressId, profilePhoto } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

        if (Array.isArray(addresses)) {
            user.addresses = addresses;
            if (defaultAddressId) user.defaultAddressId = defaultAddressId;
            const defaultAddr = user.addresses.find(a => a.id === user.defaultAddressId) || user.addresses[0];
            if (defaultAddr) {
                user.address = {
                    houseStreet: defaultAddr.addressLine || defaultAddr.fullName + ' | ' + defaultAddr.phone,
                    city: defaultAddr.city,
                    state: defaultAddr.state,
                    pincode: defaultAddr.pincode
                };
            }
        }

        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address,
            addresses: user.addresses,
            defaultAddressId: user.defaultAddressId,
            profilePhoto: user.profilePhoto
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/user/wishlist
// @desc    Get authenticated user's wishlist
// @access  Private
router.get('/wishlist', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('wishlist');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.wishlist || []);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/user/wishlist/toggle
// @desc    Add or remove a product from the wishlist
// @access  Private
router.post('/wishlist/toggle', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if product is already in wishlist
        const existingIndex = user.wishlist.findIndex(
            w => w.productId && w.productId.toString() === productId
        );

        let action;
        if (existingIndex > -1) {
            // Remove from wishlist
            user.wishlist.splice(existingIndex, 1);
            action = 'removed';
        } else {
            // Add to wishlist
            user.wishlist.push({ productId, addedAt: new Date() });
            action = 'added';
        }

        await user.save();
        res.json({ action, wishlist: user.wishlist });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
