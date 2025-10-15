// backend/controllers/authController.js
import { db } from "../config/firebase.js";
import bcrypt from "bcryptjs";

const usersRef = db.collection("users");

// REGISTER USER
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber, dateOfBirth, gender, address } = req.body;

    if (!firstName || !lastName || !email || !password || !role)
      return res.status(400).json({ message: "Missing required fields" });

    const snapshot = await usersRef.where("email", "==", email).get();
    if (!snapshot.empty) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      firstName, lastName, email,
      password: hashedPassword,
      role, phoneNumber, dateOfBirth, gender, address,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const docRef = await usersRef.add(newUser);
    res.status(201).json({ id: docRef.id, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// LOGIN USER
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields required" });

    const snapshot = await usersRef.where("email", "==", email).get();
    if (snapshot.empty) return res.status(400).json({ message: "Invalid credentials" });

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const valid = await bcrypt.compare(password, userData.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({ id: userDoc.id, ...userData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET CURRENT USER
export const getMe = async (req, res) => {
  try {
    const { id } = req.query;
    const userDoc = await usersRef.doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found" });

    res.status(200).json(userDoc.data());
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
