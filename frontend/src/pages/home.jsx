import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { IconButton } from "@mui/material";
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from "../contexts/authContext";
import {Button, TextField} from "@mui/material";
import withAuth from "../utils/withAuth";

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState();

    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    }

    let handleLogout = async () => {
        localStorage.removeItem("token")
        navigate("/auth")
    }

    return (
        <>
            <div className="navBar">
                <div style={{display: "flex", alignItems: "center"}}>
                    <h1>VideoMeet</h1>
                </div>
                <div style={{display: "flex", alignItems: "center", gap: "2rem"}}>
                    <div style={{display: "flex", alignItems: "center"}}>
                        <IconButton onClick={() => navigate("/history")}>
                            <RestoreIcon/>
                        </IconButton>
                        <p style={{fontWeight: "500", fontSize: "16px"}}>History</p>
                    </div>
                    <Button variant="outlined"
                     style={{fontSize: "0.8rem", fontWeight: "600"}}
                     onClick={handleLogout}
                     >
                        Logout
                    </Button>
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div className="">
                        <h1 style={{fontSize: "40px", marginBottom: "1rem"}}>Providing <span style={{color:"#1976d2"}}>Quality Video Call</span> <br></br> Just Like Quality Education</h1>
                        <div style={{display: "flex", gap: "10px"}}>
                            <TextField style={{minWidth: '300px'}} onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" lable="Meeting Code" variant="outlined"></TextField>
                            <Button style={{paddingInline: "26px", fontSize: "0.9rem"}} onClick={handleJoinVideoCall} variant="contained" disabled={!meetingCode}>Join</Button>
                        </div>
                    </div>
                </div>
                <div className="rightPanel">
                    <img srcSet="/logo3.png" alt="img" />
                </div>
            </div>
        </>
    )
}

export default withAuth(HomeComponent);