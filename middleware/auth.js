const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('/auth/login');
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.redirect('/auth/login');
        }

        req.user = user;
        next();
    } catch (error) {
        res.redirect('/auth/login');
    }
};

const authorize = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).render('error', { message: 'Access denied' });
        }
        next();
    };
};

module.exports = { auth, authorize };
