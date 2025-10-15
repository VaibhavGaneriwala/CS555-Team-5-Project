// backend/models/AdherenceLog.js
export const adherenceLogModel = {
  collection: "adherenceLogs",
  fields: [
    "patientId", "medicationId", "scheduledTime",
    "takenAt", "status", "notes", "createdAt"
  ],
};
