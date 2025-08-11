const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const Donation = require('../models/Donation');

const router = express.Router();

router.use(auth);
router.use(authorize(['donor']));

router.get('/dashboard', async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.user._id }).sort({ createdAt: -1 });
        res.render('donor/dashboard', { user: req.user, donations });
    } catch (error) {
        res.render('donor/dashboard', { user: req.user, donations: [], error: 'Error fetching donations' });
    }
});

router.get('/donation-form', (req, res) => {
    res.render('donor/donation-form', { user: req.user });
});

router.post('/donate', async (req, res) => {
    try {
        const { units, location } = req.body;
        
        const donation = new Donation({
            donor: req.user._id,
            bloodGroup: req.user.bloodGroup,
            units,
            location
        });
        
        await donation.save();
        res.redirect('/donor/dashboard');
    } catch (error) {
        res.render('donor/donation-form', { user: req.user, error: 'Error submitting donation' });
    }
});

module.exports = router;
