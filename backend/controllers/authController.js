const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const registerValidation = require('../utils/validation');

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
};

exports.register = async (req, res) => {
    try {
        const { error } = registerValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const {firstName, lastName, email, password, role, phoneNumber, dateOfBirth, gender, address} = req.body;
        if (!firstName || !lastName || !email || !password || !role || !phoneNumber || !dateOfBirth || !gender || !address){
            return res.status(400).json({message: 'All fields are required'});
        }
        const userExists = await User.findOne({email});
        if (userExists){
            return res.status(400).json({message: 'User already exists'});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({firstName, lastName, email, password: hashedPassword, role: role || 'patient', phoneNumber, dateOfBirth, gender, address});
        if (user){
            res.status(201).json({
                _id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id).toString()
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password){
            return res.status(400).json({message: 'All fields are required'});
        }
        const user = await User.findOne({email});
        if (!user){
            return res.status(401).json({message: 'Invalid credentials'});
        }
        if (!user.isActive) return res.status(400).json({message: 'User is not active'});
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({message: 'Invalid credentials'});
        res.status(200).json({
            _id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token: generateToken(user._id).toString()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getMe = async (req, res) => {
    try {
        // Get the logged in user from auth token
        let token;
        if (req.headers && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        }
        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token provided' });
        }
        // Verify token and load user from token payload
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('Token verification failed', err);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
        // Find the user based on the decoded ID
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Return full name and email and role
        res.status(200).json({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};