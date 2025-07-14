import axios from "axios";
import { createContext, useState, useContext } from "react";
import {useNavigate} from "react-router-dom"
import httpStatus from "http-status"


// creating a context
export const AuthContext = createContext({});

// cretating a axios instatnce which provide baseURL,
// which we will use multiple times 
const client = axios.create({
    baseURL: "http://localhost:5000/api/v1/users"
})


export const AuthProvider = ({children}) => {

    const authContext = useContext(AuthContext);  // using the AuthContext we created globally
    const [userData, setUserData] = useState(); // initialising data
    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            
            let req = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })

            if(req.status === httpStatus.CREATED) {
                return req.data.message;
            }

        } catch(err) {
            throw err;
        }
    }

    const handleLogin = async (username, password) => {
        try {

            let req = await client.post("/login", {
                username: username,
                password: password
            });
            console.log("Login response:", req.data);
            if(req.status === httpStatus.OK) {
                localStorage.setItem("token", req.data.token);
                console.log("Stored token:", localStorage.getItem("token"));
            }

        } catch(err) {
            throw err;
        }
    }

    const data ={
        userData, setUserData, handleRegister, handleLogin
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
}