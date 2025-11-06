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
