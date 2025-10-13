// Generate auth token
import jwt from 'jsonwebtoken';

// use jwtSecret to generate an auth token
const generateToken = (id) => {
    const jwtSecret = process.env.JWT_SECRET
    return jwt.sign({
        id
    },
    jwtSecret,
    {
        // set expiration date to 30 days
        expiresIn: '30d'
    });
}

export default generateToken;