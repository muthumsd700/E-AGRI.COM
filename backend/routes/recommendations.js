const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/recommendations
// @desc    Get personalized product recommendations for consumer
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { limit = 6, category } = req.query;
        const limitNum = parseInt(limit);
        
        // Get user's order history
        const orders = await Order.find({ consumer: req.user.id })
            .populate('items.product', 'category farmer');
        
        // Extract categories from past purchases
        const purchasedCategories = new Set();
        const purchasedFarmerIds = new Set();
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.product && item.product.category) {
                    purchasedCategories.add(item.product.category);
                }
                if (item.farmer) {
                    purchasedFarmerIds.add(item.farmer.toString());
                }
            });
        });
        
        let recommendations = [];
        
        // Build query based on available data
        const query = { quantity: { $gt: 0 } };
        if (category) {
            query.category = category;
        }
        
        // Strategy 1: Products from farmers the user has bought from before
        if (purchasedFarmerIds.size > 0) {
            const farmerProducts = await Product.find({
                ...query,
                farmerId: { $in: Array.from(purchasedFarmerIds) }
            })
            .populate('farmerId', 'name')
            .limit(limitNum);
            
            recommendations.push(...farmerProducts.map(p => ({
                ...p.toObject(),
                reason: `From ${p.farmerId?.name || 'your favorite farmer'}`
            })));
        }
        
        // Strategy 2: Products in categories user has purchased before
        if (purchasedCategories.size > 0 && recommendations.length < limitNum) {
            const categoryProducts = await Product.find({
                ...query,
                category: { $in: Array.from(purchasedCategories) },
                _id: { $nin: recommendations.map(r => r._id) }
            })
            .populate('farmerId', 'name')
            .limit(limitNum - recommendations.length);
            
            recommendations.push(...categoryProducts.map(p => ({
                ...p.toObject(),
                reason: `Based on your ${p.category} purchases`
            })));
        }
        
        // Strategy 3: Popular/featured products (fallback)
        if (recommendations.length < limitNum) {
            const popularProducts = await Product.find({
                quantity: { $gt: 0 },
                _id: { $nin: recommendations.map(r => r._id) }
            })
            .populate('farmerId', 'name')
            .sort({ createdAt: -1 })
            .limit(limitNum - recommendations.length);
            
            recommendations.push(...popularProducts.map(p => ({
                ...p.toObject(),
                reason: 'Popular this week'
            })));
        }
        
        // Strategy 4: Seasonal recommendations (based on current month)
        const currentMonth = new Date().getMonth();
        const seasonalCategories = getSeasonalCategories(currentMonth);
        
        if (seasonalCategories.length > 0 && recommendations.length < limitNum) {
            const seasonalProducts = await Product.find({
                quantity: { $gt: 0 },
                category: { $in: seasonalCategories },
                _id: { $nin: recommendations.map(r => r._id) }
            })
            .populate('farmerId', 'name')
            .limit(limitNum - recommendations.length);
            
            recommendations.push(...seasonalProducts.map(p => ({
                ...p.toObject(),
                reason: 'In season now'
            })));
        }
        
        res.json(recommendations.slice(0, limitNum));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Helper function to get seasonal categories based on month (for India)
function getSeasonalCategories(month) {
    // Month is 0-indexed (0 = January, 11 = December)
    const seasonalMap = {
        0: ['leafy-greens', 'root-vegetables'], // January
        1: ['leafy-greens', 'root-vegetables'], // February
        2: ['summer-vegetables', 'fruits'], // March
        3: ['summer-vegetables', 'fruits', 'mangoes'], // April
        4: ['summer-vegetables', 'fruits', 'mangoes'], // May
        5: ['monsoon-vegetables', 'leafy-greens'], // June
        6: ['monsoon-vegetables', 'leafy-greens'], // July
        7: ['monsoon-vegetables', 'leafy-greens'], // August
        8: ['winter-vegetables', 'grains'], // September
        9: ['winter-vegetables', 'grains', 'pulses'], // October
        10: ['winter-vegetables', 'grains', 'pulses'], // November
        11: ['root-vegetables', 'leafy-greens'] // December
    };
    
    return seasonalMap[month] || [];
}

module.exports = router;
