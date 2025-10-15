import express from "express";
import {
  logAdherence,
  getAdherenceLogs,
  updateAdherenceLog,
  deleteAdherenceLog,
} from "../controllers/adherenceController.js";

const router = express.Router();
router.post("/", logAdherence);
router.get("/", getAdherenceLogs);
router.put("/:id", updateAdherenceLog);
router.delete("/:id", deleteAdherenceLog);

export default router;
