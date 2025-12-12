const AdherenceLog = require('../models/AdherenceLog');
const Medication = require('../models/Medication');
const User = require('../models/User'); // Ensure User model is loaded for populate

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

    // ADMIN LOGIC - can view all logs, optionally filter by patientId
    else if (user.role === "admin") {
      if (patientId) {
        query.patient = patientId;
      }

      if (startDate || endDate) {
        const range = {};
        if (startDate) range.$gte = new Date(startDate);
        if (endDate) range.$lte = new Date(endDate);

        query.$or = [
          { takenAt: range },
          { scheduledTime: range }
        ];
      }
    }

    let logs = await AdherenceLog.find(query)
      .populate("patient", "firstName lastName email")
      .populate("medication", "name dosage")
      .sort({ takenAt: -1 })
      .lean(); // Use lean() to get plain objects directly

    // Check if populate worked - patient should be an object with firstName, or an ObjectId
    // If patient is not an object with firstName, it means populate failed
    const patientIdsToFetch = [];
    logs.forEach((log, index) => {
      // Check if patient is not properly populated (no firstName property)
      if (log.patient && (!log.patient.firstName)) {
        // Convert ObjectId to string if needed
        const patientId = log.patient._id ? log.patient._id.toString() : 
                         (typeof log.patient === 'string' ? log.patient : 
                         (log.patient.toString ? log.patient.toString() : null));
        if (patientId) {
          patientIdsToFetch.push(patientId);
        }
      }
    });

    if (patientIdsToFetch.length > 0) {
      console.log(`Manually populating ${patientIdsToFetch.length} patients that weren't auto-populated`);
      const patients = await User.find({ _id: { $in: patientIdsToFetch } })
        .select('firstName lastName email')
        .lean();
      
      const patientMap = {};
      patients.forEach(patient => {
        patientMap[patient._id.toString()] = patient;
      });

      // Replace unpopulated patients with patient objects
      logs = logs.map(log => {
        if (log.patient && !log.patient.firstName) {
          // Try to get the ID in various formats
          const patientId = log.patient._id ? log.patient._id.toString() : 
                           (typeof log.patient === 'string' ? log.patient : 
                           (log.patient.toString ? log.patient.toString() : null));
          if (patientId && patientMap[patientId]) {
            log.patient = patientMap[patientId];
          } else {
            log.patient = null;
          }
        }
        return log;
      });
    }

    // Debug logging for admin
    if (user.role === "admin" && logs.length > 0) {
      const firstLog = logs[0];
      console.log("Sample log patient (final):", JSON.stringify(firstLog.patient, null, 2));
      console.log("Patient type:", typeof firstLog.patient);
      if (firstLog.patient && typeof firstLog.patient === 'object' && firstLog.patient.firstName) {
        console.log("✅ Patient populated successfully:", firstLog.patient.firstName, firstLog.patient.lastName);
      } else {
        console.log("❌ Patient NOT populated properly");
      }
    }

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
