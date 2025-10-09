// JWT Authentication Middleware
import jwt from 'jsonwebtoken'
import user from '../models/User'
import User from '../models/User';

// Won't use this yet, until adding medications and other user features (like profile)

// Usage (in a route):
// router.get('/profile', protect, getUserProfile) <-- getUserProfile from controller

const protect = async (req, res, next) => {
    let token;
    const secret = process.env.JWT_SECRET
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
        // make sure we have authorization and are the token bearer
    {
        try {
            // gets 'authorization' from the HTTP header paylod, and splits it based on spaces
            // [0] should contain 'Bearer' and [1] should contain the token.
            token = req.headers.authorization.split(' ')[1];
            // verify the token
            const paylod = jwt.verify(token, secret);
            req.user = await User.findById(paylod.id).select('-password');
            next();
        } catch (error) {
            return res.status(401).json({
                message: 'Not authorized, token failed'
            });
        }
    }
    if (!token) {
        res.status(401).json({
            message: 'Unauthorized'
        })
    }
}

export default protect;