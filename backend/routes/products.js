const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const auth = require('../middleware/auth'); // Assuming you have auth middleware

// @route   GET api/products/categories
// @desc    Get all unique product categories
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        res.json(categories);
    } catch (err) {
        console.error("GET /api/products/categories Error:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET api/products
// @desc    Get all products for Home Page & Catalog
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('farmerId', 'name address phone');
        res.json({ success: true, products });
    } catch (err) {
        console.error("GET /api/products Error:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET api/products/farmer/:farmerId
// @desc    Get products added by a specific farmer
// @access  Private (farmer only)
router.get('/farmer/:farmerId', auth, async (req, res) => {
    try {
        // Find products owned by the farmer
        const products = await Product.find({ farmerId: req.params.farmerId }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (err) {
        console.error("GET /api/products/farmer/:farmerId Error:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST api/products
// @desc    Add a new product
// @access  Private
router.post('/', auth, async (req, res) => {
    console.log('🚀 API: POST /api/products called');
    console.log('👤 API: User from auth:', req.user);
    console.log('📦 API: Body received:', { ...req.body, image: req.body.image ? 'Base64 image present (' + req.body.image.length + ' chars)' : 'No image' });
    
    try {
        const { name, category, price, quantity, description, image, location } = req.body;
        
        // Basic Validation
        if (!name || !price || !category) {
            console.warn('⚠️ API: Missing required fields:', { name: !!name, price: !!price, category: !!category });
            return res.status(400).json({ success: false, message: 'Product name, price, and category are required' });
        }

        // Check user exists
        const user = await User.findById(req.user.id);
        if (!user) {
            console.warn('⚠️ API: User not found in DB:', req.user.id);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Use case-insensitive role check
        const userRole = (user.role || '').toLowerCase();
        console.log('👤 API: DB User role:', user.role);
        
        if (userRole !== 'farmer') {
            console.warn('⚠️ API: User is not a farmer. Role:', user.role);
            return res.status(403).json({ success: false, message: 'Only farmers can add products. Your account is: ' + user.role });
        }

        const newProduct = new Product({
            farmerId: req.user.id,
            farmerName: user.name,
            name,
            category,
            price: parseFloat(price),
            quantity: parseInt(quantity, 10) || 0,
            description: description || '',
            image: image || '',
            location: location || (user.address ? `${user.address.city}, ${user.address.state}` : '')
        });

        console.log('💾 API: Attempting to save new product...');
        const product = await newProduct.save();
        console.log('✅ API: Product saved successfully:', product._id);
        
        res.json({ 
            success: true, 
            message: "Product added successfully", 
            product 
        });
    } catch (err) {
        console.error('❌ API: Product Save Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// @route   GET api/products/:id/reviews
// @desc    Get all reviews for a product
// @access  Public
router.get('/:id/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.id })
            .sort({ createdAt: -1 });

        // Compute average rating
        let avgRating = 0;
        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
            avgRating = parseFloat((sum / reviews.length).toFixed(1));
        }

        res.json({ success: true, reviews, avgRating, totalReviews: reviews.length });
    } catch (err) {
        console.error('GET /api/products/:id/reviews Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST api/products/:id/reviews
// @desc    Submit a new review for a product
// @access  Private
router.post('/:id/reviews', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;

        if (!rating || !comment) {
            return res.status(400).json({ success: false, message: 'Rating and comment are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        if (comment.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Comment must be at least 10 characters' });
        }

        // Verify product exists
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Get user name
        const user = await User.findById(req.user.id).select('name');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const review = new Review({
            productId: req.params.id,
            userId: req.user.id,
            userName: user.name,
            rating: parseInt(rating),
            comment: comment.trim()
        });

        await review.save();
        res.status(201).json({ success: true, message: 'Review submitted successfully', review });
    } catch (err) {
        console.error('POST /api/products/:id/reviews Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET api/products/:id
// @desc    Get single product by ID (with farmer info populated)
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('farmerId', 'name profilePhoto experience farmSize address role');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, product });
    } catch (err) {
        console.error('GET /api/products/:id Error:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT api/products/:id
// @desc    Update a product (Farmer who owns it)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check ownership
        if (product.farmerId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this product' });
        }

        const { name, category, price, quantity, description, image, location } = req.body;

        if (name) product.name = name;
        if (category) product.category = category;
        if (price !== undefined) product.price = parseFloat(price);
        if (quantity !== undefined) product.quantity = parseInt(quantity, 10);
        if (description !== undefined) product.description = description;
        if (image !== undefined) product.image = image;
        if (location !== undefined) product.location = location;

        await product.save();
        res.json({ success: true, message: 'Product updated successfully', product });
    } catch (err) {
        console.error('Product Update Error:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE api/products/:id
// @desc    Delete a product (Farmer who owns it)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check ownership
        if (product.farmerId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
        }

        await product.deleteOne();
        res.json({ success: true, message: 'Product removed' });
    } catch (err) {
        console.error('Product Delete Error:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;