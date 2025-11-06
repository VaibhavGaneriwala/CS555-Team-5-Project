const User = require('../models/User');

exports.getAssignedProviders = async (req, res) => {
  try {
    const patient = await User.findById(req.user.id).populate('provider', 'firstName lastName email phoneNumber');
    if (!patient || patient.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can view their providers.' });
    }

    const providers = patient.provider.map((prov) => ({
      _id: prov._id,
      name: `${prov.firstName} ${prov.lastName}`,
      email: prov.email,
      phoneNumber: prov.phoneNumber || 'N/A',
    }));

    res.status(200).json({ providers });
  } catch (err) {
    console.error('Error fetching assigned providers:', err);
    res.status(500).json({ message: 'Server error while fetching providers.' });
  }
};
