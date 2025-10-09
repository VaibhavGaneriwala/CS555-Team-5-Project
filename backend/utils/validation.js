const Joi = require('joi');

const registerValidation = Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'First name is required',
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name cannot exceed 50 characters'
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email'
    }),
    password: Joi.string()
        // Password atleast 8 chars, one special char, one upper case, one number
        .pattern(new RegExp('^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\'":|,.<>/?]).{8,}$'))
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.pattern.base': 'Password must contain at least 8 characters, including one uppercase letter, one number, and one special character'
        }),
    role: Joi.string().required().messages({
        'string.empty': 'Role is required'
    }),
    phoneNumber: Joi.string().required().messages({
        'string.empty': 'Phone number is required'
    }),
    dateOfBirth: Joi.date().required().messages({
        'any.required': 'Date of birth is required'
    }),
    gender: Joi.string().required().messages({
        'string.empty': 'Gender is required'
    }),
    address: Joi.object({
        streetAddress: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipcode: Joi.string().required()
    }).required()
});

module.exports = registerValidation;
