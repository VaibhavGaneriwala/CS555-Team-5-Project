const User = require('../models/User');

// @desc   Get all users (admin only)
// @route  GET /api/admin/users
// @access Private (admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // never send password
    return res.status(200).json({ users });
  } catch (err) {
    console.error('Error fetching users (admin):', err);
    return res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

// @desc   Admin: Assign a patient to a provider
// @route  POST /api/admin/assign
// @access Private (admin)
exports.assignPatientAsAdmin = async (req, res) => {
  try {
    const { patientId, providerId } = req.body;
    const adminId = req.user.id; // from protect middleware

    console.log('Admin assignment request:', { adminId, patientId, providerId });

    // Ensure caller is actually admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can perform this action.' });
    }

    if (!patientId || !providerId) {
      return res.status(400).json({ message: 'patientId and providerId are required.' });
    }

    // Fetch provider & patient
    const provider = await User.findById(providerId);
    const patient = await User.findById(patientId);

    if (!provider || provider.role !== 'provider') {
      return res.status(400).json({ message: 'Invalid provider selected.' });
    }

    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient selected.' });
    }

    // Check if already assigned to this provider
    const alreadyAssigned =
      (provider.patients || []).some((id) => id.equals(patient._id)) ||
      (patient.provider || []).some((id) => id.equals(provider._id));

    if (alreadyAssigned) {
      return res
        .status(200)
        .json({ message: 'Patient is already assigned to this provider.' });
    }

    let reassignmentMessage = '';
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
        reassignmentMessage = ` Patient was previously assigned to ${oldProvider.firstName} ${oldProvider.lastName} and has been reassigned.`;
        console.log(`Removed patient ${patient.email} from provider ${oldProvider.email}`);
      }
      
      // Clear patient's provider array
      patient.provider = [];
    }

    // Add relationship both ways
    // Provider can have multiple patients (array)
    if (!provider.patients) {
      provider.patients = [];
    }
    if (!provider.patients.some((id) => id.equals(patient._id))) {
      provider.patients.push(patient._id);
    }
    
    // Patient can have only ONE provider (array with max 1 element)
    patient.provider = [provider._id];

    await provider.save();
    await patient.save();

    console.log(
      `✅ Admin assigned patient ${patient.email} to provider ${provider.email}`
    );

    return res.status(200).json({
      message: `Patient ${patient.firstName} ${patient.lastName} assigned to provider ${provider.firstName} ${provider.lastName}.${reassignmentMessage}`,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
      },
      provider: {
        id: provider._id,
        name: `${provider.firstName} ${provider.lastName}`,
        email: provider.email,
      },
    });
  } catch (err) {
    console.error('Error in admin assign:', err);
    return res
      .status(500)
      .json({ message: 'Server error while assigning patient as admin.' });
  }
};
