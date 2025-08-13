const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

require('./config/db');

const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donor');
const recipientRoutes = require('./routes/recipient');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Routes
app.use('/auth', authRoutes);
app.use('/donor', donorRoutes);
app.use('/recipient', recipientRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Create default admin after server starts
    createDefaultAdmin();
});

const createDefaultAdmin = async () => {
    try {
        const User = require('./models/User');
        
        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            const defaultAdmin = new User({
                name: 'Admin',
                email: 'admin@bloodbank.com',
                password: 'admin123',
                role: 'admin',
                phone: '1234567890',
                address: 'Blood Bank Headquarters'
            });
            
            await defaultAdmin.save();
            console.log('\n=== DEFAULT ADMIN CREATED ===');
            console.log('Email: admin@bloodbank.com');
            console.log('Password: admin123');
            console.log('Please change the password after first login!');
            console.log('===============================\n');
        } else {
            console.log('Admin user already exists in the system.');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};
