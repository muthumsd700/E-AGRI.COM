const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const { JWT_SECRET } = require('../config/constants');

// In-memory OTP store: { userId: { code, expiresAt } }
const otpStore = new Map();

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
        const { name, phone, email, address, addresses, defaultAddressId, profilePhoto, experience, farmSize } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (email) {
            const existing = await User.findOne({ email });
            if (existing && existing.id !== user.id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }
        if (address) user.address = address;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
        
        const userRole = (user.role || '').toLowerCase();
        if (experience !== undefined && userRole === 'farmer') user.experience = experience;
        if (farmSize !== undefined && userRole === 'farmer') user.farmSize = farmSize;


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
            profilePhoto: user.profilePhoto,
            experience: user.experience,
            farmSize: user.farmSize
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

// ─── DELETE /delete — Permanently delete user account ─────────────────────────
router.delete('/delete', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await User.findByIdAndDelete(req.user.id);
        otpStore.delete(req.user.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── POST /2fa — OTP generation / verification (simulation) ──────────────────
router.post('/2fa', authMiddleware, async (req, res) => {
    try {
        const { action, code } = req.body;
        const userId = req.user.id;

        if (action === 'generate') {
            // Generate a 6-digit OTP and store it for 5 minutes
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            otpStore.set(userId, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 });
            // In production this would be sent via SMS/email.
            // For simulation we return it directly in the response.
            return res.json({ message: 'OTP generated (simulation)', otp });
        }

        if (action === 'verify') {
            const stored = otpStore.get(userId);
            if (!stored) return res.status(400).json({ message: 'No OTP found. Please generate one first.' });
            if (Date.now() > stored.expiresAt) {
                otpStore.delete(userId);
                return res.status(400).json({ message: 'OTP expired. Please generate a new one.' });
            }
            if (stored.code !== String(code)) {
                return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
            }
            // Mark 2FA as enabled in DB
            otpStore.delete(userId);
            const user = await User.findById(userId);
            if (user) {
                user.settings = user.settings || {};
                user.settings.twoFAEnabled = true;
                await user.save();
            }
            return res.json({ message: '2FA enabled successfully', twoFAEnabled: true });
        }

        if (action === 'disable') {
            const user = await User.findById(userId);
            if (user) {
                user.settings = user.settings || {};
                user.settings.twoFAEnabled = false;
                await user.save();
            }
            otpStore.delete(userId);
            return res.json({ message: '2FA disabled', twoFAEnabled: false });
        }

        return res.status(400).json({ message: 'Invalid action. Use generate, verify, or disable.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── GET /export — Export user data as JSON ───────────────────────────────────
router.get('/export', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        let orders = [];
        try {
            orders = await Order.find({ consumer: req.user.id }).lean();
        } catch (_) { /* Order model may not exist for all users */ }

        const exportData = {
            exportedAt: new Date().toISOString(),
            profile: {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                profilePhoto: user.profilePhoto || '',
                createdAt: user.createdAt
            },
            addresses: user.addresses || [],
            settings: user.settings || {},
            orders
        };

        res.setHeader('Content-Disposition', `attachment; filename="eagri-data-${Date.now()}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
