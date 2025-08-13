const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Request = require('../models/Request');
const BloodStock = require('../models/BloodStock');
const InventoryLog = require('../models/InventoryLog');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(auth);
router.use((req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', { message: 'Access denied' });
    }
});

// Dashboard route
router.get('/dashboard', async (req, res) => {
    try {
        // Get total donors and recipients with additional information
        const donors = await User.find({ role: 'donor' }).select('name bloodGroup lastDonation').lean();
        const recipients = await User.find({ role: 'recipient' }).select('name bloodGroup').lean();
        
        // Get counts and other data
        const [pendingDonations, pendingRequests, donations, requests] = await Promise.all([
            Donation.countDocuments({ status: 'pending' }),
            Request.countDocuments({ status: 'pending' }),
            Donation.find({ status: 'pending' })
                .populate('donor', 'name email bloodGroup')
                .select('bloodGroup units status createdAt donor')
                .sort('-createdAt')
                .limit(5),
            Request.find({ status: 'pending' })
                .populate('recipient', 'name email bloodGroup')
                .select('bloodGroup units status createdAt recipient')
                .sort('-createdAt')
                .limit(5)
        ]);

        // Group donors by blood group
        const donorsByBloodGroup = donors.reduce((acc, donor) => {
            acc[donor.bloodGroup] = (acc[donor.bloodGroup] || 0) + 1;
            return acc;
        }, {});

        // Group recipients by blood group
        const recipientsByBloodGroup = recipients.reduce((acc, recipient) => {
            acc[recipient.bloodGroup] = (acc[recipient.bloodGroup] || 0) + 1;
            return acc;
        }, {});

        res.render('admin/dashboard', {
            user: req.user,
            stats: { 
                donors: donors.length, 
                recipients: recipients.length, 
                pendingDonations, 
                pendingRequests,
                donorsByBloodGroup,
                recipientsByBloodGroup
            },
            donations,
            requests,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.render('admin/dashboard', { 
            user: req.user, 
            error: 'Error fetching dashboard data. Please try again later.',
            stats: { donors: 0, recipients: 0, pendingDonations: 0, pendingRequests: 0 },
            donations: [],
            requests: []
        });
    }
});

// Manage inventory routes
router.get('/manage-inventory', async (req, res) => {
    try {
        const bloodStock = await BloodStock.find().sort('bloodGroup');
        const recentLogs = await InventoryLog.find()
            .populate('relatedUser', 'name')
            .sort('-createdAt')
            .limit(10);

        res.render('admin/manage-inventory', { 
            user: req.user,
            bloodStock,
            recentLogs,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.render('admin/manage-inventory', { 
            user: req.user,
            error: 'Error fetching inventory data'
        });
    }
});

router.post('/update-inventory', async (req, res) => {
    try {
        const { bloodGroup, units, action, description } = req.body;
        
        if (!bloodGroup || !units || !action) {
            return res.redirect('/admin/manage-inventory?error=Please provide all required fields');
        }

        let stock = await BloodStock.findOne({ bloodGroup });
        if (!stock) {
            stock = new BloodStock({ bloodGroup, units: 0 });
        }

        const unitsNum = parseInt(units);

        if (action === 'add') {
            stock.units += unitsNum;
        } else if (action === 'subtract') {
            if (stock.units < unitsNum) {
                return res.redirect('/admin/manage-inventory?error=Insufficient stock');
            }
            stock.units -= unitsNum;
        } else {
            stock.units = unitsNum;
        }

        stock.lastUpdated = new Date();
        await stock.save();

        await InventoryLog.create({
            bloodGroup,
            units: unitsNum,
            type: 'adjustment',
            description: description || `${action} ${units} units`,
            relatedUser: req.user._id
        });

        res.redirect('/admin/manage-inventory?success=Inventory updated successfully');
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.redirect('/admin/manage-inventory?error=Failed to update inventory');
    }
});

// Donation approval routes
router.post('/approve-donation/:id', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id).populate('donor');
        if (!donation) {
            return res.redirect('/admin/dashboard?error=Donation not found');
        }
        if (donation.status !== 'pending') {
            return res.redirect('/admin/dashboard?error=Donation is not in pending state');
        }

        let stock = await BloodStock.findOne({ bloodGroup: donation.bloodGroup });
        if (!stock) {
            stock = new BloodStock({ bloodGroup: donation.bloodGroup, units: 0 });
        }
        stock.units += donation.units;
        stock.lastUpdated = new Date();
        await stock.save();

        await InventoryLog.create({
            bloodGroup: donation.bloodGroup,
            units: donation.units,
            type: 'donation',
            description: `Donation from ${donation.donor.name}`,
            relatedUser: donation.donor._id,
            relatedDonation: donation._id
        });
        
        await Donation.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.redirect('/admin/dashboard?success=Donation approved successfully');
    } catch (error) {
        console.error('Error approving donation:', error);
        res.redirect('/admin/dashboard?error=Failed to approve donation');
    }
});

router.post('/reject-donation/:id', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.redirect('/admin/dashboard?error=Donation not found');
        }
        if (donation.status !== 'pending') {
            return res.redirect('/admin/dashboard?error=Donation is not in pending state');
        }

        await Donation.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.redirect('/admin/dashboard?success=Donation rejected successfully');
    } catch (error) {
        console.error('Error rejecting donation:', error);
        res.redirect('/admin/dashboard?error=Failed to reject donation');
    }
});

// Request approval routes
router.post('/approve-request/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id).populate('recipient');
        if (!request) {
            return res.redirect('/admin/dashboard?error=Request not found');
        }
        if (request.status !== 'pending') {
            return res.redirect('/admin/dashboard?error=Request is not in pending state');
        }

        const stock = await BloodStock.findOne({ bloodGroup: request.bloodGroup });
        if (!stock || stock.units < request.units) {
            return res.redirect('/admin/dashboard?error=Insufficient blood stock');
        }

        stock.units -= request.units;
        stock.lastUpdated = new Date();
        await stock.save();

        await InventoryLog.create({
            bloodGroup: request.bloodGroup,
            units: -request.units,
            type: 'request',
            description: `Request for ${request.recipient.name}`,
            relatedUser: request.recipient._id,
            relatedRequest: request._id
        });

        await Request.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.redirect('/admin/dashboard?success=Request approved successfully');
    } catch (error) {
        console.error('Error approving request:', error);
        res.redirect('/admin/dashboard?error=Failed to approve request');
    }
});

router.post('/reject-request/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.redirect('/admin/dashboard?error=Request not found');
        }
        if (request.status !== 'pending') {
            return res.redirect('/admin/dashboard?error=Request is not in pending state');
        }

        await Request.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.redirect('/admin/dashboard?success=Request rejected successfully');
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.redirect('/admin/dashboard?error=Failed to reject request');
    }
});

module.exports = router;
