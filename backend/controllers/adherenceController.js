// backend/controllers/adherenceController.js
import { db } from "../config/firebase.js";

const adherenceRef = db.collection("adherenceLogs");

// CREATE
export const logAdherence = async (req, res) => {
  try {
    const { patientId, medicationId, scheduledTime, takenAt, status, notes } = req.body;
    if (!patientId || !medicationId || !scheduledTime || !status)
      return res.status(400).json({ message: "Missing required fields" });

    const newLog = {
      patientId,
      medicationId,
      scheduledTime,
      takenAt: takenAt || null,
      status,
      notes,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adherenceRef.add(newLog);
    res.status(201).json({ id: docRef.id, message: "Adherence logged successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// READ
export const getAdherenceLogs = async (req, res) => {
  try {
    const snapshot = await adherenceRef.get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// UPDATE
export const updateAdherenceLog = async (req, res) => {
  try {
    const { id } = req.params;
    await adherenceRef.doc(id).update(req.body);
    res.status(200).json({ message: "Adherence log updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE
export const deleteAdherenceLog = async (req, res) => {
  try {
    const { id } = req.params;
    await adherenceRef.doc(id).delete();
    res.status(200).json({ message: "Adherence log deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
