// backend/controllers/medicationController.js
import { db } from "../config/firebase.js";

const medsRef = db.collection("medications");

// CREATE
export const createMedication = async (req, res) => {
  try {
    const { patientId, name, dosage, frequency, schedule, startDate, endDate, instructions, prescribedBy } = req.body;
    if (!patientId || !name || !dosage || !frequency || !schedule || !startDate)
      return res.status(400).json({ message: "Missing required fields" });

    const newMedication = {
      patientId, name, dosage, frequency, schedule,
      startDate, endDate, instructions, prescribedBy,
      createdAt: new Date().toISOString(),
      isActive: true,
      reminderEnabled: true,
    };

    const docRef = await medsRef.add(newMedication);
    res.status(201).json({ id: docRef.id, message: "Medication created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// READ
export const getMedications = async (req, res) => {
  try {
    const snapshot = await medsRef.get();
    const meds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(meds);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// UPDATE
export const updateMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await medsRef.doc(id).update(updates);
    res.status(200).json({ message: "Medication updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE
export const deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;
    await medsRef.doc(id).delete();
    res.status(200).json({ message: "Medication deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
