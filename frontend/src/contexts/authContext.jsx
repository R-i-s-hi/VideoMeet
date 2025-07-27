import axios from "axios";
import { createContext, useState, useContext } from "react";
import {useNavigate} from "react-router-dom"
import httpStatus from "http-status"


// creating a context
export const AuthContext = createContext({});

// cretating a axios instatnce which provide baseURL,
// which we will use multiple times 
const client = axios.create({
    baseURL: "https://videomeet-backend-zmzo.onrender.com/api/v1/users"
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

            if(req.status === httpStatus.OK) {
                localStorage.setItem("token", req.data.token);
                setTimeout(() => {router("/home")}, 1000)
                return req.data.message;
            }
        } catch(err) {
            throw err;
        }
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            })
            return request.data;
        } catch (e) {
            throw e;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        console.log(`addToUserHistory() called for meetingCode: ${meetingCode}`);
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            console.log(`Recieved from /add_to_activity: ${request}`)
            return request.data.message;
        } catch (e) {
            throw e;
        }
    }

    const data ={
        userData, setUserData, handleRegister, handleLogin, getHistoryOfUser, addToUserHistory
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
}