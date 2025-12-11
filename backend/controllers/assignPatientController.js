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

    // If patient already has a provider, remove the old relationship
    if (patient.provider && patient.provider.length > 0) {
      const oldProviderId = patient.provider[0];
      const oldProvider = await User.findById(oldProviderId);
      
      if (oldProvider) {
        // Remove patient from old provider's list
        oldProvider.patients = (oldProvider.patients || []).filter(
          (id) => !id.equals(patient._id)
        );
        await oldProvider.save();
        console.log(`Removed patient ${patient.email} from provider ${oldProvider.email}`);
      }
      
      // Clear patient's provider array
      patient.provider = [];
    }

    // Add relationship both ways
    if (!provider.patients) {
      provider.patients = [];
    }
    provider.patients.push(patient._id);
    patient.provider = [provider._id]; // Set as single provider (array with one element)

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

    // Remove patient from provider's list
    provider.patients = providerPatients.filter(p => p !== patientId);
    // Clear patient's provider (patient can only have one provider)
    patient.provider = [];

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
