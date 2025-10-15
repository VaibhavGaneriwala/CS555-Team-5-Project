// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./config/firebase.js";
import authRoutes from "./routes/auth.js";
import medicationRoutes from "./routes/medications.js";
import adherenceRoutes from "./routes/adherence.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/adherence", adherenceRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Medication Adherence Tracker API running with Firebase 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
