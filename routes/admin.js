const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Request = require('../models/Request');

const router = express.Router();

router.use(auth);
router.use(authorize(['admin']));

// Add this route to routes/admin.js
router.get('/manage-inventory', (req, res) => {
    res.render('admin/manage-inventory', { user: req.user });
});

router.post('/update-inventory', (req, res) => {
    // This is a simplified version - in a real app, you'd have an Inventory model
    res.render('admin/manage-inventory', { 
        user: req.user, 
        success: 'Inventory updated successfully!' 
    });
});


router.get('/dashboard', async (req, res) => {
    try {
        const donors = await User.countDocuments({ role: 'donor' });
        const recipients = await User.countDocuments({ role: 'recipient' });
        const pendingDonations = await Donation.countDocuments({ status: 'pending' });
        const pendingRequests = await Request.countDocuments({ status: 'pending' });
        
        const donations = await Donation.find({ status: 'pending' }).populate('donor').limit(5);
        const requests = await Request.find({ status: 'pending' }).populate('recipient').limit(5);
        
        res.render('admin/dashboard', {
            user: req.user,
            stats: { donors, recipients, pendingDonations, pendingRequests },
            donations,
            requests
        });
    } catch (error) {
        res.render('admin/dashboard', { user: req.user, error: 'Error fetching dashboard data' });
    }
});

router.post('/approve-donation/:id', async (req, res) => {
    try {
        await Donation.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
});

router.post('/reject-donation/:id', async (req, res) => {
    try {
        await Donation.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
});

router.post('/approve-request/:id', async (req, res) => {
    try {
        await Request.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
});

router.post('/reject-request/:id', async (req, res) => {
    try {
        await Request.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
