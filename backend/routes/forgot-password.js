const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const otpStore = new Map();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateResetToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// @route   POST api/auth/forgot-password
// @desc    Send OTP to user's email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        otpStore.set(email.toLowerCase(), { otp, expiresAt, attempts: 0 });

        console.log(`\n=== PASSWORD RESET OTP ===`);
        console.log(`Email: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Expires in: 10 minutes`);
        console.log(`==========================\n`);

        res.json({ 
            message: 'OTP sent successfully to your email',
            email: email,
            note: 'For demo purposes, OTP is shown in server console'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/verify-otp
// @desc    Verify OTP and generate reset token
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const stored = otpStore.get(email.toLowerCase());
        
        if (!stored) {
            return res.status(400).json({ message: 'OTP expired or invalid. Please request a new OTP.' });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (stored.attempts >= 5) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ message: 'Too many attempts. Please request a new OTP.' });
        }

        if (stored.otp !== otp) {
            stored.attempts++;
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }

        const resetToken = generateResetToken();
        const resetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

        otpStore.set(`reset_${email.toLowerCase()}`, { token: resetToken, expiresAt: resetExpires });
        otpStore.delete(email.toLowerCase());

        res.json({ 
            message: 'OTP verified successfully',
            resetToken: resetToken
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using reset token
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ message: 'Reset token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        let foundToken = null;
        let foundEmail = null;

        for (const [key, value] of otpStore.entries()) {
            if (key.startsWith('reset_') && value.token === resetToken) {
                if (Date.now() > value.expiresAt) {
                    otpStore.delete(key);
                    return res.status(400).json({ message: 'Reset token has expired. Please request a new OTP.' });
                }
                foundToken = key;
                foundEmail = key.replace('reset_', '');
                break;
            }
        }

        if (!foundToken) {
            return res.status(400).json({ message: 'Invalid reset token. Please request a new OTP.' });
        }

        const user = await User.findOne({ email: foundEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();

        otpStore.delete(foundToken);

        res.json({ message: 'Password reset successfully. You can now login with your new password.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
