// Defining the user model and schema
import mongoose from "mongoose";
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
    // mongoose creates an _id field by default, which will be the PK
    name: { type: String, required: true},
    email: { type: String, required: true, unique: true},
    password: { type: String, required: true}
});

// Hashing password
userSchema.pre('save', async function(next) {
    // if the password isn't changed, we don't need to re-save it
    if (!this.isModified('password')) return next();
    // generate salt to ensure even if two passwords are the same,
    // they result in different hashes
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next();
});

// Compare passwords for authentication
userSchema.methods.matchPassword = async function(enteredPassword) {
    // Compare the password entered to the one stored in the database
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;