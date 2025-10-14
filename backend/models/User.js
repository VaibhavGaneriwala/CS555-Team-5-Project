const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'First name must be at least 2 characters long'],
        maxLength: [50, 'First name must be less than 50 characters long'],
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters long'],
        maxLength: [50, 'Last name must be less than 50 characters long'],
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: [8, 'Password must be at least 8 characters long'],
        maxLength: [255, 'Password must be less than 255 characters long'],
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'patient', 'provider'],
        default: 'patient'
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{10}$/, 'Invalid phone number'],
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    patients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    provider: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'other',
        required: true,
    },
    address: {
        streetAddress: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            enum: ['AL', 'AK', 'AZ', 'AR', 'AS', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'TT', 'UT', 'VT', 'VA', 'VI', 'WA', 'WV', 'WI', 'WY', 'Other'],
            default: 'Other'
        },
        zipcode: {
            type: String,
            required: true,
            trim: true,
            match: [/^\d{5}$/, 'Invalid zipcode']
        }
    },
    profilePicture: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('User', userSchema);