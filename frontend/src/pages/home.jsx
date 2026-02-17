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
                    <span style={{display: "flex", alignItems: "center", fontSize: "13.5px"}}>
                        <h1>Video</h1><h1 style={{color: "#1976d2"}}>Meet</h1>
                    </span>
                </div>
                <div className="nav-btns">
                    <div style={{cursor: "pointer",display: "flex", alignItems: "center", gap: "0.2rem", paddingInline: "17.5px 23px", height: "-webkit-fill-available", border: "1px solid gray", borderRadius: "8px", color: "gray"}} onClick={() => navigate("/history")}>
                        <IconButton
                            sx={{
                                padding: 0,
                            }}
                        >
                            <RestoreIcon
                                sx={{fontSize: 11}}
                            />
                        </IconButton>
                        <p className="history-tag" style={{fontWeight: "500", fontSize: "10.5px"}}>History</p>
                    </div>
                    <Button variant="outlined"
                     style={{fontSize: "10px", fontWeight: "600", padding: "9px 23px 5px", borderRadius: "8px", height: "-webkit-fill-available"}}
                     onClick={handleLogout}
                     >
                        Logout
                    </Button>
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h1 className="home-heading">Providing <span style={{color:"#1976d2"}}>Quality Video Call</span> <br></br> Just Like <br /> Quality Education</h1>
                        <div>
                            <TextField sx={{'& .MuiInputBase-input': { padding: '10.5px 16px', '@media (max-width:380px)': { width: '100%'}}}} style={{width: "70%", margin: "10px 0px"}} onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" lable="Meeting Code" variant="outlined"></TextField>
                            <Button style={{width: "30%", margin: "10px 0px", fontSize: "0.75rem", fontWeight: "600"}} onClick={handleJoinVideoCall} variant="contained" disabled={!meetingCode}>Join</Button>
                        </div>
                    </div>
                </div>
                <div className="rightPanel">
                    <img srcSet="/homeimage.svg" alt="img" />
                </div>
            </div>
        </>
    )
}

export default withAuth(HomeComponent);