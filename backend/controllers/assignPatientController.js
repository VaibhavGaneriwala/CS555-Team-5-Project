const User = require('../models/User');

exports.assignPatient = async (req, res) => {
  try {
    const { patientId, email } = req.body;
    const providerId = req.user.id;

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can assign patients.' });
    }

    const patient = patientId 
      ? await User.findById(patientId)
      : await User.findOne({ email: email?.toLowerCase() });

    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient ID or email.' });
    }

    const alreadyAssignedToThisProvider =
      provider.patients.includes(patient._id) ||
      patient.provider.includes(provider._id);

    if (alreadyAssignedToThisProvider) {
      return res.status(200).json({ message: 'Patient is already assigned to this provider.' });
    }

    if (patient.provider?.length > 0) {
      return res.status(400).json({ 
        message: 'Patient is already assigned to another provider. Only unassigned patients can be assigned.' 
      });
    }

    provider.patients.push(patient._id);
    patient.provider.push(provider._id);

    await Promise.all([provider.save(), patient.save()]);

    return res.status(200).json({
      message: `Patient ${patient.firstName} ${patient.lastName} assigned successfully.`,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
      },
    });
  } catch (error) {
    console.error('Error assigning patient:', error);
    return res.status(500).json({ message: 'Server error while assigning patient.' });
  }
};

exports.unassignPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const providerId = req.user.id;

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can unassign patients.' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    const providerPatients = (provider.patients || []).map(p => p.toString());
    const patientProviders = (patient.provider || []).map(p => p.toString());
    const isAssignedToThisProvider =
      providerPatients.includes(patientId) ||
      patientProviders.includes(providerId.toString());

    if (!isAssignedToThisProvider) {
      return res.status(400).json({ message: 'Patient is not assigned to this provider.' });
    }

    provider.patients = providerPatients.filter(p => p !== patientId);
    patient.provider = patientProviders.filter(p => p !== providerId.toString());

    await Promise.all([provider.save(), patient.save()]);

    return res.status(200).json({
      message: `Patient ${patient.firstName} ${patient.lastName} unassigned successfully.`,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
      },
    });
  } catch (error) {
    console.error('Error unassigning patient:', error);
    return res.status(500).json({ message: 'Server error while unassigning patient.' });
  }
};
