import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../contexts/authContext";
import { useNavigate } from "react-router";

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import HomeFilledIcon from '@mui/icons-material/HomeFilled';
import IconButton from '@mui/material/IconButton';

function History() {

    const {getHistoryOfUser} = useContext(AuthContext);

    const [meetings, setMeetings] = useState([]);

    const routeTo = useNavigate();

    useEffect(() => {
  const fetchMeetings = async () => {
    try {
      const response = await getHistoryOfUser();
      const data = Array.isArray(response) ? response : response?.data;

      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History fetch failed:", err);
      setMeetings([]);
    }
  };

  fetchMeetings();
}, []);

    let formatedDate = (dateString) => {
        const date = new Date(Number(dateString));

        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }


    return (
        <>
            <IconButton>
                <HomeFilledIcon onClick={() => {
                    routeTo("/home")
                }}></HomeFilledIcon>
            </IconButton>
            {meetings.length > 0 ? 
                <div>
                    { meetings.map((e,i) => {
                        return (
                            <>
                                <Card key={i} variant="outlined">

                                    <CardContent>
                                        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
                                            Meeting Code: {e.meetingCode}
                                        </Typography>
                                        <Typography variant="body2">
                                            Date of meeting: {formatedDate(Number(e.date))}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </>
                        )
                    })}
                </div> : 
                <p>No previous meetings</p>
            }
        </>
    )
}

export default History;