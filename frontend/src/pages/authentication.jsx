import React, { useState, useContext } from "react";
import { LockOutlineRounded } from "@mui/icons-material";
import {
  Box, Button, FormControl, TextField,
  Avatar, Snackbar
} from "@mui/material";

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
    <div style={{ display: "flex", alignItems: "center" }}>
      <div>
        <img
          style={{ width: "60vw", height: "100vh" }} src="/authimage.jpg" alt="auth"
        />
      </div>
      <div
        style={{
          display: "block",
          paddingInline: "1.5rem",
          paddingBlock: "2.5rem",
          marginLeft: "6rem",
          width: "25rem",
          border: "0.8px solid #d3d3d3",
          borderRadius: "0.3rem",
          boxShadow: "4px 4px 10px 1px rgba(0, 0, 0, 0.06)",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          <Avatar sx={{ bgcolor: "secondary.main", mb: 2, }}>
            <LockOutlineRounded />
          </Avatar>
          <Box>
            <Button
              variant={formState === 0 ? "contained" : "text"}
              onClick={() => setFormState(0)}
            >
              Login
            </Button>
            <Button
              variant={formState === 1 ? "contained" : "text"}
              onClick={() => setFormState(1)}
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
            />
          </FormControl>

          {err && <p style={{ color: "red" }}>{err}</p>}

          <Button type="submit" fullWidth variant="contained" onClick={handleAuth}>
            {formState === 0 ? "Login" : "Register"}
          </Button>

        </Box>

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