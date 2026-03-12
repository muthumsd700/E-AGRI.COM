const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = require('../middleware/auth'); // Assuming you have auth middleware

// @route   GET api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('farmer', 'name');
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/products/my
// @desc    Get products added by the logged-in farmer
// @access  Private (farmer only)
router.get('/my', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'farmer') {
            return res.status(403).json({ message: 'Only farmers can access their products' });
        }
        const products = await Product.find({ farmer: req.user.id }).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('farmer', 'name');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   POST api/products
// @desc    Add a new product (Farmers only)
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, price, image, category, stock, availability, farmingDetails } = req.body;

        // Check if user is a farmer
        const user = await User.findById(req.user.id);
        if (user.role !== 'farmer') {
            return res.status(403).json({ message: 'Only farmers can add products' });
        }

        const newProduct = new Product({
            name,
            description,
            price,
            image,
            category,
            stock,
            availability: availability !== undefined ? availability : true,
            farmer: req.user.id,
            farmerName: user.name,
            farmingDetails: farmingDetails || {}
        });

        const product = await newProduct.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/products/:id
// @desc    Update a product (Farmer who owns it)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check ownership
        if (product.farmer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { name, description, price, image, category, stock, availability, farmingDetails } = req.body;

        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price !== undefined ? price : product.price;
        product.image = image || product.image;
        product.category = category || product.category;
        product.stock = stock !== undefined ? stock : product.stock;
        product.availability = availability !== undefined ? availability : product.availability;
        if (farmingDetails) {
            product.farmingDetails = { ...product.farmingDetails.toObject(), ...farmingDetails };
        }
        product.updatedAt = Date.now();

        await product.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/products/:id
// @desc    Delete a product (Farmer who owns it)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check ownership
        if (product.farmer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   POST api/products/:id/reviews
// @desc    Add a review to a product (Consumers only)
// @access  Private
router.post('/:id/reviews', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        if (!comment || !comment.trim()) {
            return res.status(400).json({ message: 'Review comment is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user already reviewed this product
        const alreadyReviewed = product.reviews.find(
            r => r.user.toString() === req.user.id
        );
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        const review = {
            user: req.user.id,
            userName: user.name,
            rating: Number(rating),
            comment: comment.trim()
        };

        product.reviews.push(review);
        await product.save();

        res.json(product.reviews);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

module.exports = router;