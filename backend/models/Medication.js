// backend/models/Medication.js
export const medicationModel = {
  collection: "medications",
  fields: [
    "patientId", "name", "dosage", "frequency",
    "schedule", "startDate", "endDate", "instructions",
    "prescribedBy", "isActive", "reminderEnabled", "createdAt"
  ],
};
