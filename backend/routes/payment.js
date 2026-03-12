const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret'
});

// Create Order API
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency, orderId } = req.body;
        
        const options = {
            amount: amount, // amount in the smallest currency unit (paise for INR)
            currency: currency || "INR",
            receipt: `receipt_${orderId}`
        };
        
        const order = await razorpay.orders.create(options);
        
        if (!order) {
            return res.status(500).json({ error: 'Failed to create order' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Payment API
router.post('/verify-payment', async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            original_order_id,
            amount,
            userId
        } = req.body;
        
        const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');
            
        if (expectedSignature === razorpay_signature) {
            const payment = new Payment({
                userId: userId,
                orderId: original_order_id,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                amount: amount,
                status: 'completed'
            });
            await payment.save();
            
            return res.status(200).json({ 
                success: true, 
                message: 'Payment verified successfully',
                paymentId: payment._id
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid signature' 
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
