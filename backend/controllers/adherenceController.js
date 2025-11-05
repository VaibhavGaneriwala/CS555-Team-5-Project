const { default: mongoose } = require('mongoose');
const AdherenceLog = require('../models/AdherenceLog');
const Medication = require('../models/Medication');
const User = require('../models/User');

exports.logAdherence = async (req, res) => {
    try {
        const {medicationId, scheduledTime, takenAt, status, notes} = req.body;
        if (!medicationId || !scheduledTime || !status) return res.status(400).json({message: 'All fields are required'});
        const medication = await Medication.findById(medicationId);
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        if (medication.patient.toString() !== req.user._id.toString() && req.user.role === 'patient') return res.status(403).json({message: 'Not authorized to log adherence for this medication'});
        const adherenceLog = await AdherenceLog.create({patient: req.user.role === 'patient' ? req.user._id: medication.patient, medication: medicationId, scheduledTime, takenAt: takenAt || (status === 'taken' ? new Date() : null), status, notes});
        res.status(201).json(adherenceLog);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getAdherenceLogs = async (req, res) => {
    try {
        const {patientId, medicationId, startDate, endDate, status} = req.query;
        let query = {};
        if (req.user.role === 'patient'){
            query.patient = req.user._id;
        } else if (req.user.role === 'provider'){
            if (patientId){
                const provider = await User.findById(req.user._id);
                if (!provider.patients.includes(patientId)) return res.status(403).json({message: 'You are not authorized to access this patient\'s adherence logs'});
                query.patient = patientId;
            } else {
                const provider = await User.findById(req.user._id);
                query.patient = {$in: provider.patients};
            }
        } else if (req.user.role === 'admin'){
            if (patientId){
                query.patientId = query.patient = patientId;
            }
        }
        if (medicationId) query.medication = medicationId;
        if (status) query.status = status;
        if (startDate || endDate){
            query.scheduledTime = {};
            if (startDate) query.scheduledTime.$gte = new Date(startDate);
            if (endDate) query.scheduledTime.$lte = new Date(endDate);
        }
        const adherenceLogs = await AdherenceLog.find(query).populate('patient', 'firstName lastName email').populate('medication', 'name dosage').sort('-scheduledTime');
        res.status(200).json(adherenceLogs);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getAdherenceStats = async (req, res) => {
    try {
        const {patientId, startDate, endDate} = req.query;
        let matchQuery = {};
        if (req.user.role === 'patient'){
            matchQuery.patient = req.user._id;
        } else if (req.user.role === 'provider'){
            if (patientId){
                const provider = await User.findById(req.user._id);
                if (!provider.patients.includes(patientId)) return res.status(403).json({message: 'You are not authorized to access this patient\'s adherence stats'});
                matchQuery.patient = mongoose.Types.ObjectId(patientId);
            } else {
                const provider = await User.findById(req.user._id);
                matchQuery.patient = {$in: provider.patients};
            }
        } else if (req.user.role === 'admin'){
            if (patientId) matchQuery.patient = mongoose.Types.ObjectId(patientId);
        }
        if (startDate || endDate){
            matchQuery.scheduledTime = {};
            if (startDate) matchQuery.scheduledTime.$gte = new Date(startDate);
            if (endDate) matchQuery.scheduledTime.$lte = new Date(endDate);
        }
        const stats = await AdherenceLog.aggregate([{$match: matchQuery}, {$group: {_id: '$status', count: {$sum: 1}}}]);
        const total = stats.reduce((acc, curr) => acc + curr.count, 0);
        const statsWithPercentage = stats.map(stat => ({status: stat._id, count: stat.count, percentage: total > 0 ? ((stat.count / total) * 100).toFixed(2) : 0}));
        res.status(200).json({total, stats: statsWithPercentage});
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getAdherenceReport = async (req, res) => {
    try {
        if (req.user.role !== 'provider') {
            return res.status(403).json({ message: 'Only providers can access adherence reports' });
        }

        const provider = await User.findById(req.user._id).populate('patients', 'firstName lastName');
        if (!provider) return res.status(404).json({ message: 'Provider not found' });

        const report = await AdherenceLog.aggregate([
            { $match: { patient: { $in: provider.patients.map(p => p._id) } } },
            {
                $group: {
                    _id: '$patient',
                    totalLogs: { $sum: 1 },
                    taken: { $sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] } },
                    missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
                    skipped: { $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalLogs: 1,
                    taken: 1,
                    missed: 1,
                    skipped: 1,
                    pending: 1,
                    adherenceRate: {
                        $cond: [
                            { $gt: ['$totalLogs', 0] },
                            { $multiply: [{ $divide: ['$taken', '$totalLogs'] }, 100] },
                            0
                        ]
                    }
                }
            }
        ]);

        // Attach patient names
        const result = report.map(r => {
            const patient = provider.patients.find(p => p._id.toString() === r._id.toString());
            return {
                patientId: r._id,
                patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
                ...r
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateAdherenceLog = async (req, res) => {
    try{
        let log = await AdherenceLog.findById(req.params.id);
        if (!log) return res.status(404).json({message: 'Adherence log not found'});
        if (req.user.role === 'patient' && log.patient.toString() !== req.user._id.toString()) return res.status(403).json({message: 'Not authorized to update this adherence log'});
        if (req.user.role === 'provider'){
            const provider = await User.findById(req.user._id);
            if (!provider.patients.includes(log.patient)) return res.status(403).json({message: 'Not authorized to update this adherence log'});
        };
        if (req.user.role === 'admin') log = await AdherenceLog.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
        log = await AdherenceLog.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
        res.status(200).json(log);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.deleteAdherenceLog = async (req, res) => {
    try{
        const log = await AdherenceLog.findById(req.params.id);
        if (!log) return res.status(404).json({message: 'Adherence log not found'});
        if (req.user.role === 'patient' && log.patient.toString() !== req.user._id.toString()) return res.status(403).json({message: 'Not authorized to delete this adherence log'});
        if (req.user.role === 'provider'){
            const provider = await User.findById(req.user._id);
            if (!provider.patients.includes(log.patient)) return res.status(403).json({message: 'Not authorized to delete this adherence log'});
        };
        if (req.user.role === 'admin') await AdherenceLog.findByIdAndDelete(req.params.id);
        await AdherenceLog.deleteOne();
        res.status(200).json({message: 'Adherence log deleted successfully'});
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};