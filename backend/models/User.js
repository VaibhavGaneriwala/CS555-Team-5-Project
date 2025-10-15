// backend/models/User.js
export const userModel = {
  collection: "users",
  fields: [
    "firstName", "lastName", "email", "password",
    "role", "phoneNumber", "dateOfBirth", "gender",
    "address", "profilePicture", "isActive", "createdAt"
  ],
};
