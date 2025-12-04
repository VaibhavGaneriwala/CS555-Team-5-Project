const User = require('../models/User');
const AdherenceLog = require('../models/AdherenceLog');

// @desc    Get all patients for a provider with adherence summary
// @route   GET /api/provider/patients
// @access  Private (Provider only)
exports.getAssignedPatients = async (req, res) => {
  try {
    // Logged-in provider ID from JWT middleware
    const providerId = req.user.id;

    // Find provider with populated patient info
    const provider = await User.findById(providerId).populate('patients', 'firstName lastName email dateOfBirth gender');

    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied: only providers can view patients.' });
    }

    const patients = provider.patients;

    // For each patient, calculate adherence %
    const results = await Promise.all(
      patients.map(async (patient) => {
        const totalLogs = await AdherenceLog.countDocuments({ patient: patient._id });
        const takenLogs = await AdherenceLog.countDocuments({ patient: patient._id, status: 'taken' });

        const adherenceRate = totalLogs > 0 ? ((takenLogs / totalLogs) * 100).toFixed(1) : 'N/A';

        return {
          _id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          adherence: adherenceRate,
        };
      })
    );

    res.json({ provider: providerId, patients: results });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Server error while fetching patient list.' });
  }
};

// @desc    Get all available patients (for provider to assign)
// @route   GET /api/provider/available-patients
// @access  Private (Provider only)
exports.getAvailablePatients = async (req, res) => {
  try {
    // Use _id instead of id for consistency
    const providerId = req.user._id || req.user.id;

    // Verify user is a provider
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied: only providers can view available patients.' });
    }

    // Get all patients
    const allPatients = await User.find({ role: 'patient' })
      .select('firstName lastName email phoneNumber dateOfBirth gender isActive')
      .sort({ lastName: 1, firstName: 1 });

    // Get provider's currently assigned patient IDs
    const assignedPatientIds = provider.patients.map(p => p.toString());

    // Format response with assignment status
    const patients = allPatients.map(patient => ({
      _id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      isActive: patient.isActive,
      isAssigned: assignedPatientIds.includes(patient._id.toString()),
    }));

    res.json({
      success: true,
      count: patients.length,
      patients: patients,
    });
  } catch (error) {
    console.error('Error fetching available patients:', error);
    res.status(500).json({ message: 'Server error while fetching available patients.' });
  }
};
