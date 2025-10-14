const mongoose = require('mongoose');

const adherenceLogSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    medication: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medication',
        required: true,
    },
    scheduledTime: {
        type: Date,
        required: true,
    },
    takenAt: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['taken', 'missed', 'skipped', 'pending'],
        default: 'pending'
    },
    notes: {
        type: String,
    }
}, {
    timestamps: true
});

adherenceLogSchema.index({ patient: 1, scheduledTime: -1 });
adherenceLogSchema.index({ medication: 1, scheduledTime: -1 });

module.exports = mongoose.model('AdherenceLog', adherenceLogSchema);