const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [255, 'Name must be less than 255 characters long'],
    },
    dosage: {
        type: String,
        required: true,
        trim: true,
    },
    frequency: {
        type: String,
        required: true,
        enum: ['once-daily', 'twice-daily', 'three-times-daily', 'four-times-daily', 'weekly', 'as-needed', 'custom'],
    },
    schedule: [{
        time: {
            type: String,
            required: true,
        },
        days: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }]
    }],
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
    },
    instructions: {
        type: String,
    },
    prescribedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    reminderEnabled: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Medication', medicationSchema);