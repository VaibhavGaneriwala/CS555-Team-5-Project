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
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber ?? null,
            dateOfBirth: user.dateOfBirth ?? null,
            gender: user.gender ?? null,
            address: user.address ?? null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
    try {
        // Check if user is admin (should be checked by authorize middleware, but double-check)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admin access required' });
        }

        // Get all users, excluding password field, sorted alphabetically by last name, then first name
        const users = await User.find({}).select('-password')
            .populate('provider', 'firstName lastName email')
            .sort({ lastName: 1, firstName: 1 });

        // Format users for response
        const formattedUsers = users.map(user => ({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            address: user.address,
            isActive: user.isActive,
            createdAt: user.createdAt,
            patientCount: user.role === 'provider' ? (user.patients?.length || 0) : null,
            providerCount: user.role === 'patient' ? (user.provider?.length || 0) : null, // Will be 0 or 1 (max 1 provider per patient)
            hasProvider: user.role === 'patient' ? (user.provider?.length > 0) : null
        }));

        res.status(200).json({
            success: true,
            count: formattedUsers.length,
            users: formattedUsers
        });
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error while fetching users', error: error.message });
    }
};

// @desc    Get admin dashboard statistics (Admin only)
// @route   GET /api/auth/stats
// @access  Private (Admin only)
exports.getAdminStats = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admin access required' });
        }

        const Medication = require('../models/Medication');
        const AdherenceLog = require('../models/AdherenceLog');

        // Get user counts by role
        const totalUsers = await User.countDocuments({});
        const adminCount = await User.countDocuments({ role: 'admin' });
        const providerCount = await User.countDocuments({ role: 'provider' });
        const patientCount = await User.countDocuments({ role: 'patient' });
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });

        // Get medication statistics
        const totalMedications = await Medication.countDocuments({});
        const activeMedications = await Medication.countDocuments({ isActive: true });
        const inactiveMedications = await Medication.countDocuments({ isActive: false });

        // Get adherence statistics
        const totalAdherenceLogs = await AdherenceLog.countDocuments({});
        const takenLogs = await AdherenceLog.countDocuments({ status: 'taken' });
        const missedLogs = await AdherenceLog.countDocuments({ status: 'missed' });
        const skippedLogs = await AdherenceLog.countDocuments({ status: 'skipped' });
        const pendingLogs = await AdherenceLog.countDocuments({ status: 'pending' });

        // Calculate adherence rate
        const adherenceRate = totalAdherenceLogs > 0 
            ? ((takenLogs / totalAdherenceLogs) * 100).toFixed(1) 
            : 0;

        // Get recent users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

        // Get providers with patients
        const providersWithPatients = await User.countDocuments({
            role: 'provider',
            patients: { $exists: true, $ne: [] }
        });

        // Get patients with providers
        const patientsWithProviders = await User.countDocuments({
            role: 'patient',
            provider: { $exists: true, $ne: [] }
        });

        res.status(200).json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    admins: adminCount,
                    providers: providerCount,
                    patients: patientCount,
                    active: activeUsers,
                    inactive: inactiveUsers,
                    recent: recentUsers
                },
                medications: {
                    total: totalMedications,
                    active: activeMedications,
                    inactive: inactiveMedications
                },
                adherence: {
                    total: totalAdherenceLogs,
                    taken: takenLogs,
                    missed: missedLogs,
                    skipped: skippedLogs,
                    pending: pendingLogs,
                    rate: parseFloat(adherenceRate)
                },
                relationships: {
                    providersWithPatients: providersWithPatients,
                    patientsWithProviders: patientsWithProviders
                }
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Server error while fetching statistics', error: error.message });
    }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/auth/users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admin access required' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                address: user.address,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error while fetching user', error: error.message });
    }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admin access required' });
        }

        const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, address, role, isActive } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admins from changing their own email or account status
        const isEditingSelf = user._id.toString() === req.user.id;
        if (isEditingSelf) {
            if (email && email !== user.email) {
                return res.status(403).json({ message: 'You cannot change your own email address' });
            }
            if (typeof isActive === 'boolean' && isActive !== user.isActive) {
                return res.status(403).json({ message: 'You cannot change your own account status' });
            }
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Update fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email && !isEditingSelf) user.email = email.toLowerCase();
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (gender) user.gender = gender;
        if (address) user.address = address;
        if (role) user.role = role;
        if (typeof isActive === 'boolean' && !isEditingSelf) user.isActive = isActive;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                address: user.address,
            },
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const PHONE_REGEX = /^\d{10}$/;
const ZIPCODE_REGEX = /^\d{5}$/;

exports.updateMe = async (req, res) => {
    try {
        const { phoneNumber, address } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (phoneNumber) {
            if (!PHONE_REGEX.test(phoneNumber)) {
                return res.status(400).json({ message: 'Invalid phone number. Must be 10 digits.' });
            }
            user.phoneNumber = phoneNumber;
        }

        if (address) {
            if (!address.streetAddress || !address.city || !address.state || !address.zipcode) {
                return res.status(400).json({ message: 'All address fields are required: streetAddress, city, state, zipcode' });
            }
            if (!ZIPCODE_REGEX.test(address.zipcode)) {
                return res.status(400).json({ message: 'Invalid zipcode. Must be 5 digits.' });
            }
            user.address = address;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                address: user.address,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error while updating user', error: error.message });
    }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admin access required' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting yourself
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};