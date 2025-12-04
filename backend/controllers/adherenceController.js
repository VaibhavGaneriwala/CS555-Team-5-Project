const AdherenceLog = require('../models/AdherenceLog');
const Medication = require('../models/Medication');

/**
 * Log a dose taken by patient
 */
exports.logAdherence = async (req, res) => {
  try {
    const { medicationId, scheduledTime, takenAt, status } = req.body;

    if (!medicationId || !status) {
      return res.status(400).json({ message: 'Medication ID and status are required' });
    }

    const adherenceLog = await AdherenceLog.create({
      patient: req.user._id,
      medication: medicationId,
      scheduledTime,
      takenAt: takenAt || new Date(),
      status,
    });

    res.json({ message: 'Adherence logged successfully', adherenceLog });
  } catch (err) {
    console.error('Error logging adherence:', err);
    res.status(500).json({ message: 'Server error logging adherence' });
  }
};



/**
 * Get adherence logs
 * - Patients → filter by takenAt
 * - Providers → filter by scheduledTime and requires patientId
 */
exports.getAdherenceLogs = async (req, res) => {
  try {
    const { patientId, startDate, endDate } = req.query;
    const user = req.user;

    const query = {};

    // PATIENT LOGIC
    if (user.role === "patient") {
      query.patient = user._id;

      // Include logs based on BOTH takenAt AND scheduledTime
      if (startDate || endDate) {
        const range = {};
        if (startDate) range.$gte = new Date(startDate);
        if (endDate) range.$lte = new Date(endDate);

        query.$or = [
          { takenAt: range },
          { scheduledTime: range }   // ⭐ NOW PATIENT SEES FUTURE DOSES THEY LOGGED
        ];
      }
    }

    // PROVIDER LOGIC
    else if (user.role === "provider") {
      if (!patientId) {
        return res.status(400).json({
          message: "Provider must specify patientId",
        });
      }

      query.patient = patientId;

      if (startDate || endDate) {
        const range = {};
        if (startDate) range.$gte = new Date(startDate);
        if (endDate) range.$lte = new Date(endDate);

        query.scheduledTime = range;
      }
    }

    const logs = await AdherenceLog.find(query)
      .populate("medication", "name dosage")
      .sort({ takenAt: -1 });

    res.json(logs);

  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ message: "Server error fetching logs" });
  }
};



/**
 * Basic adherence statistics
 */
exports.getAdherenceStats = async (req, res) => {
  try {
    const user = req.user;

    const logs = await AdherenceLog.find({
      patient: user._id,
    });

    const taken = logs.filter(l => l.status === 'taken').length;
    const missed = logs.filter(l => l.status === 'missed').length;

    res.json({
      total: logs.length,
      taken,
      missed,
      adherenceRate: logs.length ? taken / logs.length : 0,
    });
  } catch (err) {
    console.error('Error fetching adherence stats:', err);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};



/**
 * Provider adherence report
 */
exports.getAdherenceReport = async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Providers only.' });
    }

    const providerId = req.user._id;
    const { startDate, endDate } = req.query;

    const assignedPatients = await Medication.distinct('patient', { provider: providerId });

    const query = { patient: { $in: assignedPatients } };

    if (startDate || endDate) {
      query.takenAt = {};
      if (startDate) query.takenAt.$gte = new Date(startDate);
      if (endDate) query.takenAt.$lte = new Date(endDate);
    }

    const logs = await AdherenceLog.find(query)
      .populate('medication', 'name dosage')
      .sort({ takenAt: -1 });

    res.json({ logs });
  } catch (err) {
    console.error('Error fetching adherence report:', err);
    res.status(500).json({ message: 'Server error fetching report' });
  }
};



/**
 * Provider time-series trends (placeholder)
 */
exports.getAdherenceTrends = async (req, res) => {
  try {
    res.json({
      message: "Adherence trends endpoint is active (placeholder)."
    });
  } catch (err) {
    console.error('Error fetching adherence trends:', err);
    res.status(500).json({ message: 'Server error fetching trends' });
  }
};



/**
 * Update adherence log
 */
exports.updateAdherenceLog = async (req, res) => {
  try {
    const updated = await AdherenceLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating log:', err);
    res.status(500).json({ message: 'Server error updating log' });
  }
};



/**
 * Delete adherence log
 */
exports.deleteAdherenceLog = async (req, res) => {
  try {
    const deleted = await AdherenceLog.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json({ message: 'Log deleted successfully' });
  } catch (err) {
    console.error('Error deleting log:', err);
    res.status(500).json({ message: 'Server error deleting log' });
  }
};
