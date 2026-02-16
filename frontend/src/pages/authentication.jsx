import React, { useState, useContext } from "react";
import { LockOutlineRounded } from "@mui/icons-material";
import {
  Box, Button, FormControl, TextField,
  Avatar, Snackbar
} from "@mui/material";
import { Link } from "react-router-dom";
import { AuthContext } from "../contexts/authContext";




export default function Authentication() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState(0); // 0 = login, 1 = register
  const [open, setOpen] = useState(false);

  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState();
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState();
  
  const [msgs, setMsgs] = useState();
  const [err, setErr] = useState();

  const { handleRegister, handleLogin } = useContext(AuthContext);

  const validateForm = () => {
    let isValid = true;

    if (!username.trim()) {
      setUsernameError(true);
      setUsernameErrorMessage("Please enter a valid username.");
      isValid = false;
    } else {
      setUsernameError(false);
      setUsernameErrorMessage("");
    }

    if (!password || password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {

      if (formState === 1) {
        const result = await handleRegister(name, username, password);
        setMsgs(result);
        setOpen(true);
        setErr("");
        setPassword(""); 
        setFormState(0);
      }
      if (formState === 0) {
        const result = await handleLogin(username, password);
        setMsgs(result);
        setOpen(true);
        setErr("")
        setPassword("");
      }
    } catch (e) {
      console.log(e);
      setErr(e.response?.data?.message || "Authentication failed.");
    }
  };

  return (
    <div className="authContainer">
      <div className="authimg">
        <img src="Authentication.gif" alt="Login animation" class="login-gif" />
      </div>

      <div className="authForm">
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          <Avatar sx={{ bgcolor: "secondary.main", mb: 2, }}>
            <LockOutlineRounded />
          </Avatar>

          <Box>

            <Button
              variant={formState === 0 ? "contained" : "text"}
              onClick={() => setFormState(0)}
              sx ={{
                fontWeight: 'bold',
                fontSize: '11px',
                borderRadius: '15px',
                padding: '6px 27px'
              }}
            >
              Login
            </Button>

            <Button
              variant={formState === 1 ? "contained" : "text"}
              onClick={() => setFormState(1)}
              sx ={{
                fontWeight: 'bold',
                fontSize: '11px',
                borderRadius: '15px',
                padding: '6px 16px'
              }}
            >
              Register
            </Button>

          </Box>
        </Box>

        <Box component="form" noValidate sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          
          {formState === 1 && (
            <FormControl>
              
              <TextField
                name="fullname"
                label="full name"
                value={name}
                required
                fullWidth
                id="outlined-basic"
                variant="outlined"
                onChange={(e) => setName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '17px', 
                    fontSize: '14px',
                    padding: '0px',
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }
                }}
              />
            </FormControl>
          )}

          <FormControl>
            <TextField
              name="username"
              label="username"
              value={username}
              required
              fullWidth
              error={usernameError}
              helperText={usernameErrorMessage}
              id="outlined-basic"
              variant="outlined"
              onChange={(e) => setUsername(e.target.value)}
              sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '17px', 
                    fontSize: '14px',
                    padding: '0px',
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }
                }}
            />
          </FormControl>

          <FormControl>
            <TextField
              name="password"
              label="password"
              value={password}
              type="password"
              required
              fullWidth
              error={passwordError}
              helperText={passwordErrorMessage}
              id="outlined-basic"
              variant="outlined"
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '17px', 
                    fontSize: '14px',
                    padding: '0px',
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }
                }}
            />
          </FormControl>

          {err && <p style={{ color: "red" }}>{err}</p>}

          <Button type="submit" fullWidth variant="contained" onClick={handleAuth}
            sx={{
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '14px',
              fontWeight: 600,
            }}
          >
            {formState === 0 ? "Login" : "Register"}
          </Button>


        </Box>
        
        <Link to="/" style={{ textDecoration: "none", color: "#b8b8b8", fontSize: '12px', fontWeight: '500', display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem'}}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(0 0 0)">
              <path d="M4 11.9966L20.0014 11.9966M9.99599 6L4 11.9998L9.99599 18" stroke="#b8b8b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
              <span>Back to Home</span>
          </div>
          </Link>

        <Snackbar
          open={open}
          autoHideDuration={4000}
          onClose={() => setOpen(false)}
          message={msgs}
        />
      </div>
    </div>
  );
}