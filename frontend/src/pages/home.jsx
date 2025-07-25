import React, { useContext, useState } from "react";
import { useNavigate } from "react-router";
import "../App.css";
import { IconButton } from "@mui/material";
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from "../contexts/authContext";


function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState();

    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    }

    return (
        <>
            <div className="navBar">
                <div style={{display: "flex", alignItems: "center"}}>
                    <h3>VideoMeet</h3>
                </div>
                <div style={{display: "flex", alignItems: "center"}}>
                    <IconButton>
                        <RestoreIcon/>
                    </IconButton>
                    <p>History</p>
                    <Button onClick={() => {
                        localStorage.removeItem("token")
                        navigate("/auth")
                    }}>
                        Logout
                    </Button>
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div className="">
                        <h2>Providing Quality Video Call Just Like Quality Education</h2>
                        <div style={{display: "flex", gap: "10px"}}>
                            <TextField onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" lable="Meeting Code" variant="outlined"></TextField>
                            <Button onClick={handleJoinVideoCall} variant="contained">Join</Button>
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