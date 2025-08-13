const mongoose = require('mongoose');

const bloodStockSchema = new mongoose.Schema({
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    units: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BloodStock', bloodStockSchema);
