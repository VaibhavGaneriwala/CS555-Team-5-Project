import Joi from 'joi';

const registerValidation = Joi.object({
    // Ensure the name is valid and within the set range
    name: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters'
    }),
    // Ensure the email is a valid email
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email'
    }),
    // Ensure the password is a valid password (>= 8 chars, one int, one special char, one uppercase char)
    password: Joi.string()
        .pattern(new RegExp('^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\'":|,.<>/?]).{8,}$'))
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.pattern.base': 'Password must contain atleast 8 characters, including one uppercase letter, one number, and one special character'
        })
});

export default registerValidation;