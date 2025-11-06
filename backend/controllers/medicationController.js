const Medication = require('../models/Medication');
const User = require('../models/User');
const mongoose = require('mongoose');

// Function to check the medication access based on role
async function checkMedicationAccess(user, medication = null, patientId = null) {
    const targetPatientId = patientId || medication?.patient?._id || medication?.patient;

    if (!targetPatientId) return false;
    if (user.role === 'admin') return true;

    if (user.role === 'patient') {
        return targetPatientId.toString() === user._id.toString();
    }

    if (user.role === 'provider') {
        const provider = await User.findById(user._id);
        if (!provider) return false;
        return provider.patients.map(p => p.toString()).includes(targetPatientId.toString());
    }

    return false;
}

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
        
        // Ensure that the prescribedId is valid
        let prescriberId = prescribedBy || req.user._id;
        
        if (!mongoose.Types.ObjectId.isValid(prescriberId)) {
            return res.status(400).json({ message: 'Invalid prescribedBy ID' });
        }
        // Make sure that the prescriber exists and is a provider
        const prescriber = await User.findById(prescriberId);

        if (!prescriber || prescriber.role !== 'provider') {
            return res.status(400).json({ message: 'prescribedBy must be a valid provider' });
        }

        const medication = await Medication.create({
            patient,
            name,
            dosage,
            frequency,
            schedule,
            startDate,
            endDate,
            instructions,
            prescribedBy: prescriber._id
        });
        res.status(201).json({
            message: `Successfully created medication ${name} for ${patient}.`
        });
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
        const medication_id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(medication_id)) {
            return res.status(404).json({ message: 'Medication Id is invalid' });
        }
        const medication = await Medication.findById(medication_id).populate('patient', 'firstName lastName email').populate('prescribedBy', 'firstName lastName email');
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        const authorized = await checkMedicationAccess(req.user, medication);
        if (!authorized) {
            return res.status(403).json({ message: 'You are not authorized to access this medication' });
        }
        res.status(200).json(medication);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.updateMedication = async (req, res) => {
    try{
        const medication_id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(medication_id)) {
            return res.status(404).json({ message: 'Medication Id is invalid' });
        }
        let medication = await Medication.findById(medication_id);
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        const authorized = await checkMedicationAccess(req.user, medication);
        if (!authorized) {
            return res.status(403).json({ message: 'You are not authorized to update this medication' });
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
        const medication_id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(medication_id)) {
            return res.status(404).json({ message: 'Medication Id is invalid' });
        }
        const medication = await Medication.findById(medication_id);
        if (!medication) return res.status(404).json({message: 'Medication not found'});
        const authorized = await checkMedicationAccess(req.user, medication);
        if (!authorized) {
            return res.status(403).json({ message: 'You are not authorized to delete this medication' });
        }
        await Medication.deleteOne();
        res.status(200).json({message: 'Medication deleted successfully'});
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};