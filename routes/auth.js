const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

router.get('/register', (req, res) => {
    res.render('auth/register');
});

router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('bloodGroup').notEmpty().withMessage('Blood group is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/register', { errors: errors.array() });
        }

        const { name, email, password, role, bloodGroup, phone, address, age } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('auth/register', { errors: [{ msg: 'User already exists' }] });
        }

        const user = new User({ name, email, password, role, bloodGroup, phone, address, age });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
        res.cookie('token', token, { httpOnly: true });
        
        res.redirect(`/${role}/dashboard`);
    } catch (error) {
        res.render('auth/register', { errors: [{ msg: 'Server error' }] });
    }
});

router.get('/login', (req, res) => {
    res.render('auth/login');
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !await user.comparePassword(password)) {
            return res.render('auth/login', { error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
        res.cookie('token', token, { httpOnly: true });
        
        res.redirect(`/${user.role}/dashboard`);
    } catch (error) {
        res.render('auth/login', { error: 'Server error' });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

module.exports = router;
