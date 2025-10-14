const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
};

exports.register = async (req, res) => {
    try {
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
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
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
            return res.status(400).json({message: 'Invalid credentials'});
        }
        if (!user.isActive) return res.status(400).json({message: 'User is not active'});
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({message: 'Invalid credentials'});
        res.status(200).json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user){
            return res.status(400).json({message: 'User not found'});
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};