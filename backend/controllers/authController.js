// Controller to handle user authentication
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'

// Register the user
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // check if a user exists with the email entered
        const exists = await User.findOne({ email });

        if (exists) {
            return res.status(400).json({
                message: 'Email already registered'
            });
        }
        // create the user and await the response
        const user = await User.create({
            name: name,
            email: email,
            password: password
        });
        // check if the user was registered and return info if successful
        if (user) {
            const { _id, name, email}  = user
            res.status(201).json({
                _id: _id,
                name: name,
                email: email,
                message: 'Registed successfully!'
            });
        } else {
            res.status(400).json({ message: 'Failed to register user: invalid info' });
        }
    } catch (error) {
        // again, maybe add logging later
        console.error(error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
}

// Login the user
export const loginUser = async (req, res) => {
    try {
        const { email, password} = req.body;
        const user = await User.findOne({ email });
        // make sure the user exists and the password is valid
        if (user && (await user.matchPassword(password))) {
            const { _id, name, email } = user
            res.json({
                _id: _id,
                name: name,
                email: email,
                token: generateToken(_id)
            })
        } else {
            // side note: was thinking of checking for valid email/password separately,
            // but realized that could leak which emails are valid, so decided against it
            res.status(401).json({
                message: 'Invalid credentials!'
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Server error'
        })
    }
}