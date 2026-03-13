const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// @route   GET /api/consumers/me
// @desc    Get current consumer profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.role !== 'consumer') {
            return res.status(403).json({ message: 'Only consumers can access this endpoint' });
        }
        
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT /api/consumers/me
// @desc    Update consumer profile
// @access  Private
router.put('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.role !== 'consumer') {
            return res.status(403).json({ message: 'Only consumers can access this endpoint' });
        }
        
        const { name, phone, address, settings, profilePhoto } = req.body;
        
        // Update fields if provided
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (settings) user.settings = { ...user.settings, ...settings };
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
        
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/consumers/me/stats
// @desc    Get consumer dashboard statistics
// @access  Private
router.get('/me/stats', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Get all orders for this consumer
        const orders = await Order.find({ consumer: req.user.id });
        
        // Calculate total orders
        const totalOrders = orders.length;
        
        // Calculate total amount spent
        const totalSpent = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
        
        // Get unique farmers from orders
        const farmerIds = new Set();
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.farmer) farmerIds.add(item.farmer.toString());
            });
        });
        const favoriteFarmers = farmerIds.size;
        
        // Calculate estimated savings (assume 15% savings compared to retail)
        const savings = Math.round(totalSpent * 0.15);
        
        // Get orders by status
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'delivered').length;
        
        res.json({
            totalOrders,
            totalSpent,
            favoriteFarmers,
            savings,
            pendingOrders,
            completedOrders,
            memberSince: user.createdAt
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/consumers/me/orders
// @desc    Get consumer order history
// @access  Private
router.get('/me/orders', auth, async (req, res) => {
    try {
        const { period } = req.query;
        
        let dateFilter = {};
        if (period === '6months') {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            dateFilter = { createdAt: { $gte: sixMonthsAgo } };
        } else if (period === '1year') {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            dateFilter = { createdAt: { $gte: oneYearAgo } };
        }
        
        const orders = await Order.find({ 
            consumer: req.user.id,
            ...dateFilter
        })
        .populate('items.product', 'name image')
        .populate('items.farmer', 'name')
        .sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/consumers/me/wishlist
// @desc    Get consumer wishlist (favorite products)
// @access  Private
router.get('/me/wishlist', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('wishlist.productId', 'name price image farmer category');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const products = user.wishlist.map(item => item.productId).filter(p => p);
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/consumers/me/wishlist/:productId
// @desc    Add product to wishlist
// @access  Private
router.post('/me/wishlist/:productId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const product = await Product.findById(req.params.productId);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Check if already in wishlist
        const exists = user.wishlist.some(item => 
            item.productId.toString() === req.params.productId
        );
        
        if (exists) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }
        
        user.wishlist.push({
            productId: req.params.productId,
            addedAt: new Date()
        });
        
        await user.save();
        res.json({ message: 'Added to wishlist', wishlist: user.wishlist });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE /api/consumers/me/wishlist/:productId
// @desc    Remove product from wishlist
// @access  Private
router.delete('/me/wishlist/:productId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        user.wishlist = user.wishlist.filter(item => 
            item.productId.toString() !== req.params.productId
        );
        
        await user.save();
        res.json({ message: 'Removed from wishlist', wishlist: user.wishlist });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/consumers/me/favorite-farmers
// @desc    Get unique farmers from order history
// @access  Private
router.get('/me/favorite-farmers', auth, async (req, res) => {
    try {
        const orders = await Order.find({ consumer: req.user.id })
            .populate('items.farmer', 'name email phone address profilePhoto');
        
        // Extract unique farmers
        const farmerMap = new Map();
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.farmer && !farmerMap.has(item.farmer._id.toString())) {
                    farmerMap.set(item.farmer._id.toString(), item.farmer);
                }
            });
        });
        
        res.json(Array.from(farmerMap.values()));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
