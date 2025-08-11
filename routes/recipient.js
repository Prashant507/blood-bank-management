const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const Request = require('../models/Request');

const router = express.Router();

router.use(auth);
router.use(authorize(['recipient']));

router.get('/dashboard', async (req, res) => {
    try {
        const requests = await Request.find({ recipient: req.user._id }).sort({ createdAt: -1 });
        res.render('recipient/dashboard', { user: req.user, requests });
    } catch (error) {
        res.render('recipient/dashboard', { user: req.user, requests: [], error: 'Error fetching requests' });
    }
});

router.get('/request-form', (req, res) => {
    res.render('recipient/request-form', { user: req.user });
});

router.post('/request', async (req, res) => {
    try {
        const { bloodGroup, units, urgency, location, hospital, requiredBy } = req.body;
        
        const request = new Request({
            recipient: req.user._id,
            bloodGroup,
            units,
            urgency,
            location,
            hospital,
            requiredBy
        });
        
        await request.save();
        res.redirect('/recipient/dashboard');
    } catch (error) {
        res.render('recipient/request-form', { user: req.user, error: 'Error submitting request' });
    }
});

module.exports = router;
