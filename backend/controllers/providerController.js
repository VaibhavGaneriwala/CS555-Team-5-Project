const User = require('../models/User');
const AdherenceLog = require('../models/AdherenceLog');

exports.getAssignedPatients = async (req, res) => {
  try {
    const providerId = req.user.id;
    const provider = await User.findById(providerId).populate('patients', 'firstName lastName email dateOfBirth gender phoneNumber address');

    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied: only providers can view patients.' });
    }

    const results = await Promise.all(
      provider.patients.map(async (patient) => {
        const [totalLogs, takenLogs] = await Promise.all([
          AdherenceLog.countDocuments({ patient: patient._id }),
          AdherenceLog.countDocuments({ patient: patient._id, status: 'taken' })
        ]);

        const adherenceRate = totalLogs > 0 ? ((takenLogs / totalLogs) * 100).toFixed(1) : 'N/A';

        return {
          _id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          phoneNumber: patient.phoneNumber,
          address: patient.address,
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

exports.getAvailablePatients = async (req, res) => {
  try {
    const providerId = req.user._id || req.user.id;
    const provider = await User.findById(providerId);
    
    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied: only providers can view available patients.' });
    }

    const assignedPatientIds = new Set(provider.patients.map(p => p.toString()));
    const patientsWithProviders = await User.find({ role: 'patient' })
      .select('firstName lastName email phoneNumber dateOfBirth gender isActive provider')
      .populate('provider', 'firstName lastName email')
      .sort({ lastName: 1, firstName: 1 });

    const allPatients = patientsWithProviders.map(patient => {
      const isAssignedToAnyProvider = patient.provider?.length > 0;
      const isAssignedToThisProvider = assignedPatientIds.has(patient._id.toString());
      
      return {
        _id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phoneNumber: patient.phoneNumber,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        isActive: patient.isActive,
        isAssigned: isAssignedToThisProvider,
        isAssignedToAnyProvider: isAssignedToAnyProvider,
        assignedProvider: isAssignedToAnyProvider && !isAssignedToThisProvider ? patient.provider[0] : null,
      };
    });

    res.json({
      success: true,
      count: allPatients.length,
      patients: allPatients,
    });
  } catch (error) {
    console.error('Error fetching available patients:', error);
    res.status(500).json({ message: 'Server error while fetching available patients.' });
  }
};
