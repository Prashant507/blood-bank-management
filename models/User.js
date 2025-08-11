const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['donor', 'recipient', 'admin'],
        default: 'donor'
    },
    bloodGroup: {
        type: String,
        required: function() { return this.role !== 'admin'; }
    },
    phone: String,
    address: String,
    age: Number,
    lastDonation: Date,
    eligibleToDonate: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
