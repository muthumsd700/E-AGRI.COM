const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET api/orders/farmer-summary
// @desc    Get farmer earnings & order summary
// @access  Private (farmer only)
router.get('/farmer-summary', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'farmer') {
            return res.status(403).json({ message: 'Only farmers can view this summary' });
        }

        const orders = await Order.find({ 'items.farmer': req.user.id }).sort({ createdAt: -1 });

        const totalOrders = orders.length;
        const totalSales = orders.filter(o => ['delivered', 'shipped', 'out_for_delivery'].includes(o.status)).length;

        // Calculate revenue only from this farmer's items
        let revenue = 0;
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.farmer && item.farmer.toString() === req.user.id) {
                    revenue += (item.price || 0) * (item.quantity || 0);
                }
            });
        });

        const estimatedProfit = Math.round(revenue * 0.72); // ~28% costs

        // Monthly revenue for last 6 months
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            const label = monthNames[d.getMonth()];
            let amount = 0;
            orders.forEach(order => {
                const oDate = new Date(order.createdAt);
                if (oDate.getFullYear() === d.getFullYear() && oDate.getMonth() === d.getMonth()) {
                    order.items.forEach(item => {
                        if (item.farmer && item.farmer.toString() === req.user.id) {
                            amount += (item.price || 0) * (item.quantity || 0);
                        }
                    });
                }
            });
            monthlyRevenue.push({ month: label, amount: Math.round(amount) });
        }

        res.json({ totalOrders, totalSales, revenue: Math.round(revenue), estimatedProfit, monthlyRevenue });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders/my
// @desc    Get user's orders (Consumer)
// @access  Private
router.get('/my', auth, async (req, res) => {
    try {
        const orders = await Order.find({ consumer: req.user.id })
            .populate('items.product', 'name image')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders/user/:userId
// @desc    Get user's orders (Consumer)
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
    try {
        if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const orders = await Order.find({ consumer: req.params.userId })
            .populate('items.product', 'name image')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders/received
// @desc    Get orders received by a farmer
// @access  Private
router.get('/received', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'farmer') {
            return res.status(403).json({ message: 'Only farmers can view received orders' });
        }

        // Find orders where at least one item belongs to this farmer
        const orders = await Order.find({ 'items.farmer': req.user.id })
            .populate('consumer', 'name email address')
            .sort({ createdAt: -1 });

        // For each order, we might want to only show the items belonging to this farmer
        const farmerOrders = orders.map(order => {
            const myItems = order.items.filter(item => item.farmer.toString() === req.user.id);
            const myTotal = myItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            
            return {
                ...order.toObject(),
                items: myItems,
                totalAmount: myTotal // Farmer sees their portion's total
            };
        });

        res.json(farmerOrders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('consumer', 'name email')
            .populate('items.product', 'name image');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns this order OR is a farmer of one of the items
        const isConsumer = order.consumer._id.toString() === req.user.id;
        const isFarmer = order.items.some(item => item.farmer && item.farmer.toString() === req.user.id);

        if (!isConsumer && !isFarmer) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(order);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   POST api/orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.product} not found` });
            }

            if (product.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }

            orderItems.push({
                product: item.product,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image,
                farmer: product.farmerId // Link to farmer
            });

            totalAmount += product.price * item.quantity;

            // Reduce quantity
            product.quantity -= item.quantity;
            await product.save();
        }

        const newOrder = new Order({
            consumer: req.user.id,
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod: paymentMethod || 'cash_on_delivery',
            status: 'Pending',
            trackingSteps: [{ status: 'Order Placed', date: new Date() }]
        });

        const order = await newOrder.save();
        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status (for farmers/admins)
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Fetch user from DB to get role (JWT payload only contains id)
        const requestingUser = await User.findById(req.user.id).select('role');
        const isAdmin = requestingUser && requestingUser.role === 'admin';

        // Only allow status update if the user is a farmer of at least one item in the order
        const isFarmer = order.items.some(item => item.farmer && item.farmer.toString() === req.user.id);
        if (!isFarmer && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this order' });
        }

        order.status = status;
        order.updatedAt = Date.now();

        await order.save();
        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;