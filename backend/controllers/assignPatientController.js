const User = require('../models/User');

// @desc    Assign a patient to a provider (by ID or Email)
// @route   POST /api/provider/assign
// @access  Private (Provider only)
exports.assignPatient = async (req, res) => {
  try {
    const { patientId, email } = req.body;
    const providerId = req.user.id; // from protect middleware

    console.log('Assign request:', { providerId, patientId, email });

    // 🔐 Check if current user is a provider
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res
        .status(403)
        .json({ message: 'Only providers can assign patients.' });
    }

    // 🔎 Find patient by either ID or Email
    let patient = null;
    if (patientId) {
      patient = await User.findById(patientId);
    } else if (email) {
      patient = await User.findOne({ email: email.toLowerCase() });
    }

    console.log('Found patient:', patient ? patient.email : 'none');

    // ❌ Patient not found or not a valid role
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient ID or email.' });
    }

    // 🩺 Check if already assigned
    const alreadyAssigned =
      provider.patients.includes(patient._id) ||
      patient.provider.includes(provider._id);

    if (alreadyAssigned) {
      return res
        .status(200)
        .json({ message: 'Patient is already assigned to this provider.' });
    }

    // ✅ Add the relationship both ways
    provider.patients.push(patient._id);
    patient.provider.push(provider._id);

    await provider.save();
    await patient.save();

    console.log(
      `✅ Assigned patient ${patient.email} to provider ${provider.email}`
    );

    return res.status(200).json({
      message: `Patient ${patient.firstName} ${patient.lastName} assigned successfully.`,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
      },
    });
  } catch (error) {
    console.error('❌ Error assigning patient:', error);
    return res
      .status(500)
      .json({ message: 'Server error while assigning patient.' });
  }
};
