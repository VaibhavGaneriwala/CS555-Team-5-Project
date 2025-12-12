const Medication = require('../models/Medication');
const User = require('../models/User');
const mongoose = require('mongoose');

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
        const providerPatientIds = new Set((provider.patients || []).map(p => p.toString()));
        return providerPatientIds.has(targetPatientId.toString());
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
        
        let prescriberId = prescribedBy || req.user._id;
        
        if (!mongoose.Types.ObjectId.isValid(prescriberId)) {
            return res.status(400).json({ message: 'Invalid prescribedBy ID' });
        }
        
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
            const provider = await User.findById(req.user._id);
            if (patientId){
                const providerPatientIds = new Set(provider.patients.map(p => p.toString()));
                if (!providerPatientIds.has(patientId.toString())){
                    return res.status(403).json({message: 'You are not authorized to access this patient\'s medications'});
                }
                query.patient = patientId;
            } else {
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
        
        // Allow partial updates, but require at least one field to change.
        const allowedFields = new Set([
            'name',
            'dosage',
            'frequency',
            'schedule',
            'startDate',
            'endDate',
            'instructions',
            'prescribedBy',
            'reminderEnabled',
        ]);
        const updates = Object.fromEntries(
            Object.entries(req.body || {}).filter(([key, value]) => allowedFields.has(key) && value !== undefined)
        );
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'At least one valid field is required to update' });
        }

        // If prescribedBy is being updated, ensure it's a valid provider.
        if (updates.prescribedBy) {
            if (!mongoose.Types.ObjectId.isValid(updates.prescribedBy)) {
                return res.status(400).json({ message: 'Invalid prescribedBy ID' });
            }
            const prescriber = await User.findById(updates.prescribedBy);
            if (!prescriber || prescriber.role !== 'provider') {
                return res.status(400).json({ message: 'prescribedBy must be a valid provider' });
            }
        }

        medication = await Medication.findByIdAndUpdate(medication_id, updates, {new: true, runValidators: true});
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
        
        const medication = await Medication.findById(medication_id).populate('patient');
        if (!medication) {
            return res.status(404).json({message: 'Medication not found'});
        }
        
        const authorized = await checkMedicationAccess(req.user, medication);
        if (!authorized) {
            return res.status(403).json({ message: 'You are not authorized to delete this medication' });
        }
        
        const result = await Medication.findByIdAndDelete(medication_id);
        if (!result) {
            return res.status(404).json({message: 'Medication not found'});
        }
        
        res.status(200).json({message: 'Medication deleted successfully'});
    } catch (error){
        console.error('Delete medication error:', error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

exports.toggleReminder = async (req, res) => {
  try {
    const medId = req.params.id;
    const userId = req.user._id;

    const medication = await Medication.findOne({
      _id: medId,
      patient: userId,
    });

    if (!medication) {
      return res
        .status(404)
        .json({ message: 'Medication not found or not owned by this patient.' });
    }

    medication.reminderEnabled = !medication.reminderEnabled;
    await medication.save();

    return res.json({
      message: medication.reminderEnabled
        ? 'Smart reminders have been enabled for this medication.'
        : 'Smart reminders have been disabled for this medication.',
      reminderEnabled: medication.reminderEnabled,
    });
  } catch (err) {
    console.error('toggleReminder error:', err);
    return res
      .status(500)
      .json({ message: 'Failed to toggle reminder setting.' });
  }
};