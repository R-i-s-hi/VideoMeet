import httpStatus from 'http-status';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';   // used to create a token(on login/signup)

import User from '../models/user.model.js';


const register = async (req, res) => {

    const {name, username, password} = req.body;

    try {

        const existingUser = await User.findOne({username});
        if(existingUser){
            return res.status(httpStatus.FOUND).json({message: "Username already exists"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });
        await newUser.save();

        return res.status(httpStatus.CREATED).json({message: "User registered successfully"});

    } catch(e) {
        res.json({
            message: `Something went wrong ${e}`
        })
    }
}


const login = async (req, res) => {
    const {username, password} = req.body;

    if(!username || !password){
        return res.status(httpStatus.BAD_REQUEST).json({message: "Username and password both are required"});
    }

    try {

        const user = await User.findOne({username});

        if(!user) {
            return res.status(httpStatus.NOT_FOUND).json({message: "User not found"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch) {
            let token = crypto.randomBytes(20).toString('hex');
            user.token = token;
            await user.save();
            
            return res.status(httpStatus.OK).json({
                message: "Login successful",
                token,
            });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({message : "Invalid username or password"})
        }

    } catch(e) {
        res.json({
            message: `Something went wrong ${e}`
        })
    }
}

export {login, register};