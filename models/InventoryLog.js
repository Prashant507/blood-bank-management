const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    units: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['donation', 'request', 'adjustment']
    },
    description: String,
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    relatedDonation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
    },
    relatedRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
