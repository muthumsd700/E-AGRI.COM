const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   GET /api/farmers/:farmerId
// @desc    Get public farmer profile for product details page
// @access  Public
router.get('/:farmerId', async (req, res) => {
    try {
        const farmer = await User.findById(req.params.farmerId)
            .select('name profilePhoto experience farmSize address role');

        if (!farmer) {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }

        if (farmer.role !== 'farmer') {
            return res.status(400).json({ success: false, message: 'User is not a farmer' });
        }

        // Build a clean location string
        const location = farmer.address
            ? [farmer.address.city, farmer.address.state].filter(Boolean).join(', ')
            : '';

        res.json({
            success: true,
            farmer: {
                _id: farmer._id,
                name: farmer.name,
                profilePhoto: farmer.profilePhoto || '',
                experience: farmer.experience || '',
                farmSize: farmer.farmSize || '',
                location: location
            }
        });
    } catch (err) {
        console.error('GET /api/farmers/:farmerId Error:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
