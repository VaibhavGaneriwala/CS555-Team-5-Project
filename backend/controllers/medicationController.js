const Medication = require('../models/Medication');
const User = require('../models/User');

exports.createMedication = async (req, res) => {
    try {
        const {name, dosage, frequency, schedule, startDate, endDate, instructions, prescribedBy, patientId} = req.body;
        let patient;
        if (req.user.role === 'patient'){
            patient = req.user._id;
        } else if (req.user.role === 'provider' || req.user.role === 'admin'){
            if (!patientId){
                return res.status(400).json({message: 'Patient ID is required'});
            }
            patient = patientId;
        }
        if (!name || !dosage || !frequency || !schedule || !startDate)return res.status(400).json({message: 'All fields are required'});
        
        const medication = await Medication.create({patient, name, dosage, frequency, schedule, startDate, endDate, instructions, prescribedBy: prescribedBy || req.user._id});
        res.status(201).json(medication);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getMedications = async (req, res) => {
    try{
        let query = {};
        if (req.user.role === 'patient'){
            query.patient = req.user._id;
        } else if (req.user.role === 'provider'){
            const {patientId} = req.query;
                // Load provider once and use for both branches
                const provider = await User.findById(req.user._id);
                if (patientId){
                    // Ensure the provider is authorized for the requested patient.
                    // provider.patients may contain ObjectIds, so compare as strings.
                    const allowed = provider.patients.map(p => p.toString()).includes(patientId.toString());
                    if (!allowed){
                        return res.status(403).json({message: 'You are not authorized to access this patient\'s medications'});
                    }
                    query.patient = patientId;
                } else {
                    // No specific patient requested: return meds for all patients of this provider
                    query.patient = { $in: provider.patients };
            }
        } else if (req.user.role === 'admin'){
            const {patientId} = req.query;
            if (patientId){
                query.patient = patientId;
            }
        }
        const medications = await Medication.find(query).populate('patient', 'firstName lastName email').populate('prescribedBy', 'firstName lastName email').sort('-createdAt');
        res.status(200).json(medications);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.getMedicationById = async (req, res) => {
    try{
        const medication = await Medication.findById(req.params.id).populate('patient', 'firstName lastName email').populate('prescribedBy', 'firstName lastName email');
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        if (req.user.role === 'patient' && medication.patient._id.toString() !== req.user._id.toString()) return res.status(403).json({message: 'You are not authorized to access this medication'});
        if (req.user.role === 'provider'){
            const provider = await User.findById(req.user._id);
            if (!provider.patients.includes(medication.patient._id)) return res.status(403).json({message: 'You are not authorized to access this medication'});
        }
        res.status(200).json(medication);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.updateMedication = async (req, res) => {
    try{
        let medication = await Medication.findById(req.params.id);
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        if (req.user.role === 'patient' && medication.patient.toString() !== req.user._id.toString()) return res.status(403).json({message: 'Not authorized to update this medication'});
        if (req.user.role === 'provider'){
            const provider = await User.findById(req.user._id);
            if (!provider.patients.includes(medication.patient._id)) return res.status(403).json({message: 'You are not authorized to update this medication'});
        }
        medication = await Medication.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
        res.status(200).json(medication);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.deleteMedication = async (req, res) => {
    try {
        const medication = await Medication.findById(req.params.id);
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        if (req.user.role === 'patient' && medication.patient.toString() !== req.user._id.toString()) return res.status(403).json({message: 'Not authorized to delete this medication'});
        if (req.user.role === 'provider') {
            const provider = await User.findById(req.user._id);
            if (!provider.patients.includes(medication.patient)) return res.status(403).json({message: 'Not authorized to delete this medication'});
        }
        await Medication.deleteOne();
        res.status(200).json({message: 'Medication deleted successfully'});
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};