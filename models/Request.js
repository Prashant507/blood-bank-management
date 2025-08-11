const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bloodGroup: {
        type: String,
        required: true
    },
    units: {
        type: Number,
        required: true
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'fulfilled', 'rejected'],
        default: 'pending'
    },
    location: String,
    hospital: String,
    requiredBy: Date
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
