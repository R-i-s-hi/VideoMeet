import { useEffect, useState, useRef } from "react";
import { TextField, Button, IconButton, Badge } from "@mui/material";
import Draggable from 'react-draggable';
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import { useNavigate } from "react-router";
import { io } from "socket.io-client";
import styles from "../styles/videoComponent.module.css";


const server_url = "http://localhost:5000";

// Using STUN server for public IP
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  sdpSemantics: 'unified-plan',
};

// store RTCPeerConnections keyed by socketID
var connections = {}; 




function VideoMeetComponent() {

  var socketRef = useRef(); // Websocket Instance
  const videoRef = useRef([]); // All video streams
  let socketIdRef = useRef(); // socketID instance
  let localVideoRef = useRef(); // local video instance(User video)
  let userMediaStreamRef = useRef(); // local video/audio stream instance

  let [video, setVideo] = useState(true); // video permission
  let [audio, setAudio] = useState(true); // audio permission
  let [screenAvailable, setScreenAvailable] = useState(true); // screen permission

  let [videoAvailable, setVideoAvailable] = useState(true); // video toogle
  let [audioAvailable, setAudioAvailable] = useState(true); // audio toogle
  let [screen, setScreen] = useState(false); // screenShare toogle
  let [showModal, setShowModal] = useState(true); // chatbox toogle

  let [messages, setMessages] = useState([]); // all chat messages
  let [message, setMessage] = useState(""); // input chat message we will send
  let [newMessages, setNewMessages] = useState(0); // count of new unread messages

  let [askForUsername, setAskForUsername] = useState(true); // ask for username before joining the meeting
  let [username, setUsername] = useState(""); // store username entered for the meeting

  let [videos, setVideos] = useState([]); // store all video present in a media stream

  const [time, setTime] = useState(''); // time storing
  const nodeRef = useRef(null);
  const scrollAnchor = useRef(null);

  // --- tbd ---
  useEffect(() => {
    console.log("Current videos[] state:", videos);
  }, [videos]);

  useEffect(() => {
  scrollAnchor.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

  // --- Clear stream chache ---
  useEffect(() => {
    return () => {
      console.log("Cleaning up resources...");
      
      // 1. Media streams
      [localVideoRef.current?.srcObject, userMediaStreamRef.current, window.localStream]
        .filter(Boolean)
        .forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });

      // 2. Peer connections
      Object.values(connections).forEach(peer => {
        try {
          peer.close();
        } catch (e) {
          console.error("Error closing peer:", e);
        }
      });
      connections = {};

      // 3. Socket
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
      }
      setUsername("");
      setAskForUsername(true);
    };
  }, []);

  // --- Live Time ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setTime(formattedTime);
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // if(isChrome() === false) {

  // }

  // --- Stop All Stream ---
  function stopMediaTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  }

  // --- Muted stream ---
  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  // --- Black Stream ---
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  // --- Get permissions from device ---
  const getPermissions = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices(); // retuens a devices array
                                                // type         // value
      const hasVideo = devices.some((device) => device.kind === "videoinput");
      const hasAudio = devices.some((device) => device.kind === "audioinput");

      setVideoAvailable(hasVideo);
      setAudioAvailable(hasAudio);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      // if permission not granted then creted a blacksilence
      if (!hasVideo && !hasAudio) {
        console.warn("No media devices found.");
        window.localStream = new MediaStream([black(), silence()]); // creating a blackSilence stream
        localVideoRef.current.srcObject = window.localStream;
        return;
      }

      // A stream created and assigned
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: hasVideo,
        audio: hasAudio,
      });

      
      if (userMediaStream && localVideoRef.current) {
        userMediaStreamRef.current = userMediaStream;
        localVideoRef.current.srcObject = userMediaStream;

        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current
            .play()
            .catch((err) => console.error("Playback error:", err));
        };
      } else {
        console.log("no userMediaStream or localVideoRef");
      }

    } catch (error) {
      console.error("Media device error:", error);
    }
  };

  let getUserMediaSuccess = async (stream) => {

    // remove old streams(avoids duplication)
    try {
      if (
        window.localStream &&
        typeof window.localStream.getTracks === "function"
      ) {
        stopMediaTracks(window.localStream);
      }
    } catch (e) {
      console.log("getTracks error:", e);
    }

    // if there is no stream add the stream 
    window.localStream = stream; // save new stream
    localVideoRef.current.srcObject = stream; // display stream

    // play the stream after adding
    if (localVideoRef.current) {
      localVideoRef.current.onloadedmetadata = () => {
        localVideoRef.current
          .play()
          .catch((e) => console.error("Playback error:", e));
      };
    }

    await replaceStreamTracks(stream);

    // sends sdp offer to all peers
    for (let id in connections) {

      if (id === socketIdRef.current) continue; // skip offer for ourself

      try {
        const peer = connections[id];

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (e) {
        console.error("Failed to renegotiate with peer:", id, e);
      }

      // handle stream ends
      stream.getTracks().forEach(
        (track) =>
          (track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
              if (localVideoRef.current && localVideoRef.current.srcObject) {
                stopMediaTracks(localVideoRef.current.srcObject);
              }
            } catch (e) {
              console.log(e);
            }

            // create a blackSilence and pass it to the stream
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;
          })
      );
    };
  }

  // Triggers navigator.mediaDevices.getUserMedia(...) with the current video/audio settings.
  // Calls getUserMediaSuccess() when stream is fetched.
  // If media is off, it stops any existing tracks.
  const getUserMedia = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some((device) => device.kind === "videoinput");
      const hasAudio = devices.some((device) => device.kind === "audioinput");

      if ((video && hasVideo) || (audio && hasAudio)) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video && hasVideo,
          audio: audio && hasAudio,
        });
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current
            .play()
            .catch((err) => console.error("playback error:", err));
        };
        getUserMediaSuccess(stream);
      } else {
        // Clean up existing stream if any
        if (localVideoRef.current?.srcObject) {
          stopMediaTracks(localVideoRef.current?.srcObject);
          window.localStream = new MediaStream([black(), silence()]);
          localVideoRef.current.srcObject = window.localStream;
        }
      }
    } catch (e) {
      console.error("Failed to get media:", e);
      // Fallback to black/silence if getUserMedia fails
      window.localStream = new MediaStream([black(), silence()]);
      localVideoRef.current.srcObject = window.localStream;
    }
  };

  let getDisplayMediaSuccess = async (stream) => {
    // stop old stream
    stopMediaTracks(window.localStream);

    window.localStream = stream;

    // Set local video
    localVideoRef.current.srcObject = stream;

    await new Promise(resolve => setTimeout(resolve, 100));

    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack || videoTrack.readyState !== "live") {
      console.warn("Video track is not live yet");
      return;
    }

    replaceStreamTracks(stream);
  

    // On screen share stop
    stream.getVideoTracks()[0].onended = () => {
      setScreen(false);

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((camStream) => {
          stopMediaTracks(window.localStream); // stop the old screen stream, not the cam stream
          window.localStream = camStream;
          localVideoRef.current.srcObject = camStream;
          replaceStreamTracks(camStream);
        })
        .catch((err) => {
          console.error("Error switching back to camera:", err);
        });
    };
  };

  let getDisplayMedia = () => {

    if (!screen) {
      // Screen was just turned OFF, fallback to camera
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(camStream => {
          stopMediaTracks(window.localStream);
          window.localStream = camStream;
          localVideoRef.current.srcObject = camStream;
          replaceStreamTracks(camStream);
        })
        .catch(console.error);
      return;
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then((stream) => {
          stopMediaTracks(window.localStream); // stop only after permission
          getDisplayMediaSuccess(stream); // proceed normally
        })
        .catch((e) => {
          console.error("Screen share error:", e);
          setScreen(false);
          getUserMedia(); // fallback to camera if denied
        });
    }
  };

  // whenever video/audio change getUserMedia handles the stream
  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      const timer = setTimeout(() => getUserMedia(), 300); // Debounce
      return () => clearTimeout(timer);
    }
  }, [audio, video]);

  // --- Check for permission automatically ---
  useEffect(() => {
    getPermissions();
  }, []);

  // --- Clear stream chache & sockets automatically ---
  useEffect(() => {
    return () => {
      stopMediaTracks(localVideoRef.current?.srcObject);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // --- Trigger only after UI switches(handle user stream after entering username) ---
  useEffect(() => {
    if (
      localVideoRef.current &&
      userMediaStreamRef.current &&
      !localVideoRef.current.srcObject
    ) {
      localVideoRef.current.srcObject = userMediaStreamRef.current;

      localVideoRef.current.onloadedmetadata = () => {
        localVideoRef.current
          .play()
          .catch((err) => console.error("Playback error:", err));
      };
    }
  }, [askForUsername]);

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  useEffect(() => {
    console.log(" Current peer video list:", videos);
  }, [videos]);

  async function replaceStreamTracks(newStream) {
    window.localStream = newStream;

    for (const id of Object.keys(connections)) {
      const peer = connections[id];
      if (!peer) continue;

      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];

      const senders = peer.getSenders();

      senders.forEach(sender => {
    console.log("Sender:", sender.track?.kind, sender);
  });

      senders.forEach(sender => {
        if (sender.track?.kind === "video" && videoTrack) {
          sender.replaceTrack(videoTrack).catch(console.error);
        } else if (sender.track?.kind === "audio" && audioTrack) {
          sender.replaceTrack(audioTrack).catch(console.error);
        }
      });

      // Inside replaceStreamTracks:
      senders.forEach(sender => {
        if (sender.track?.kind === "video" && videoTrack) {
          sender.replaceTrack(videoTrack).catch(console.error);
        } else if (sender.track?.kind === "audio" && audioTrack) {
          sender.replaceTrack(audioTrack).catch(console.error);
        }
      });
    }
  } 

  let handleVideo = () => {
    const videoTrack = window.localStream?.getVideoTracks?.()[0];
    if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    setVideo(prev => !prev);
  };

  let handleAudio = () => {
    const audioTrack = window.localStream?.getAudioTracks?.()[0];
    if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    setAudio(prev => !prev);
  };

  let handleScreen = () => {
    setScreen((prev) => !prev);
  };

  let sendMessage = (e) => {
    e.preventDefault()
    if (message.trim() === "") return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  let route = useNavigate();

  const handleCallEnd = async () => {
    try {
      // 1. Stop all media streams
      const mediaStreams = [
        localVideoRef.current?.srcObject,
        userMediaStreamRef.current,
        window.localStream
      ].filter(Boolean);
      
      mediaStreams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });

      // 2. Close all peer connections
      Object.keys(connections).forEach(peerId => {
        try {
          if (connections[peerId]) {
            connections[peerId].close();
            delete connections[peerId];
          }
        } catch (e) {
          console.error(`Error closing connection to ${peerId}:`, e);
        }
      });

      // 3. Notify server and disconnect socket
      if (socketRef.current) {
        try {
          socketRef.current.emit("leave-call");
          await socketRef.current.disconnect();
        } catch (e) {
          console.error("Error disconnecting socket:", e);
        }
      }

      // 4. Clear state
      setVideos([]);
      videoRef.current = [];

      // 5. Navigate after cleanup
      setTimeout(() => route("/home"), 100);
    } catch (e) {
      console.error("Error ending call:", e);
      route("/home");
    }
  };

  const PeerVideo = ({ stream, muted, username }) => {
    const videoRef = useRef();

    useEffect(() => {

      if (!stream) {
        console.warn("No stream for peer:", username);
        return;
      }

      console.log("<PeerVideo /> mounted for:", username);
      console.log("Assigned stream:", stream);

      if (videoRef.current && stream) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name === "AbortError") {
              console.warn("play() was aborted, likely due to a new stream being set.");
            } else {
              console.error("Playback error:", err);
            }
          });
        }
      }
    }, [stream]);

    return (
      <div className={styles.peerVideoContainer}>
        <video autoPlay playsInline muted={muted} ref={videoRef} style={{ width: "100%", height: "100%"}}/>
        <p>{username}</p>
      </div>
    );
  };

  // --- Handle "chat-message" socket events ---
  let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) },
    ]);

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevMessages) => prevMessages + 1);
    }
  };


  // --- Handle creation of new Peer connection ---
  const createPeerConnection = async (peerId, isPolite) => {

    if (connections[peerId]) {
      console.warn(`Already have connection for ${peerId}`);
      return connections[peerId];
    }

    console.log("Creating new peer connection for:", peerId);

    const peer = new RTCPeerConnection(peerConfigConnections);
    connections[peerId] = peer;

    peer.isPolite = isPolite;
    peer._queuedCandidates = [];

    // Track received from remote peer
    peer.ontrack = (event) => {

      console.log("ontrack triggered for peer:", peerId);
      console.log("event.streams:", event.streams);

      const stream = event.streams[0];
      const streamKey = `${peerId}-${stream.id}`;

      setVideos(prev => [
        ...prev.filter(v => v.key !== streamKey),
        { socketId: peerId, stream, muted: false, username: peer.username || peerId, key: streamKey }
      ]);

      console.log(`Received stream from ${peerId}`);
    };

    // Send local ICE candidates
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current.emit("signal", peerId, JSON.stringify({ ice: candidate }));
      }
    };
    
    // Negotiation
    peer.isMakingOffer = false;

    peer.onnegotiationneeded = async () => {
      console.log("onnegotiationneeded triggered for", peerId);

      // If we're already making an offer or not stable, bail out
      if (peer.signalingState !== "stable" || peer.isMakingOffer) {
        console.warn(`Skipping negotiationneeded: signalingState=${peer.signalingState}, isMakingOffer=${peer.isMakingOffer}`);
        return;
      }

      try {
        peer.isMakingOffer = true;

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: peer.localDescription }));
        console.log(`Sent offer via onnegotiationneeded to ${peerId}`);
      } catch (err) {
        console.error("Negotiation error:", err);
      } finally {
        peer.isMakingOffer = false;
      }
    };

    // Add local tracks
    const localStream = localVideoRef.current?.srcObject;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
        console.log(`Added local ${track.kind} track to peer ${peerId}`);
      });
    } else {
      console.warn("No local stream found when creating peer");
    }

    return peer;
  };

  // --- Handle deeting peer stream if signal issue occured ---
  const handleRoleConflict = async (peerId) => {
    console.warn("Role conflict with", peerId);

    // 1. Clean up old connection
    if (connections[peerId]) {
      try {
        connections[peerId].close();
      } catch (e) {
        console.error("Error closing peer:", e);
      }
      delete connections[peerId];
    }

    // 2. Remove from UI
    setVideos(prev => prev.filter(v => v.socketId !== peerId));

    // 3. Wait a bit (jitter avoids race conditions)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // 4. Recreate full connection
    await createPeerConnection(peerId);
  };

  // --- Handles incoming signaling messages from other peers via socket:(SDP/ICE Candidate) ---
  const gotMessageFromServer = async (fromId, rawMessage) => {
    console.log("gotMessageFromServer triggered from", fromId);

    try {

      if (fromId === socketIdRef.current) return; // skip yourself

      let signal;
      try {
        signal = JSON.parse(rawMessage);
      } catch (err) {
        console.error("Invalid JSON from", fromId, rawMessage);
        return;
      }

      console.log("Got signal from", fromId, signal.sdp?.type || "ICE");

      // Always ensure peer exists
      const peer = connections[fromId] || await createPeerConnection(fromId);

      if (peer.isPolite === undefined) {
        peer.isPolite = socketIdRef.current > fromId;
      }

      // --- SDP Handling ---
      if (signal.sdp) {

        const description = new RTCSessionDescription(signal.sdp);
        
        // State validation
        const isOffer = description.type === "offer";

        // Prevent offer clash
        const polite = peer.isPolite; 
        const stable = peer.signalingState === "stable";

        const offerCollision = isOffer &&
          (!polite || !stable || peer.isMakingOffer);

        if (offerCollision) {
          console.warn("Offer collision with", fromId);
          // Rollback and wait for their offer
          await peer.setLocalDescription({ type: "rollback" });
          console.log("Rolled back local description due to offer collision");

          await peer.setRemoteDescription(description);
          console.log("setRemoteDescription (after rollback) from", fromId);

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          console.log("Created answer after offer collision", answer);

          socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: peer.localDescription }));
          return;
        }

        // Critical section - prevent race conditions
        console.log("Setting remote description of type:", description.type);
        console.log("signalingState before setRemoteDesc:", peer.signalingState);

        if (description.type === "answer" && peer.signalingState !== "have-local-offer") {
          console.warn(`Skipping invalid answer: signalingState is ${peer.signalingState}`);
          return;
        }


        await peer.setRemoteDescription(description)
          .then(() => {console.log(`setRemoteDescription(${description.type}) from ${fromId}`)})
          .catch(e => {
            console.error("setRemoteDescription failed:", e);
            throw e;
          });
          console.log("signalingState after setRemoteDesc:", peer.signalingState);

        if (peer._queuedCandidates?.length) {
          for (const candidate of peer._queuedCandidates) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("Flushed queued ICE:", candidate);
            } catch (err) {
              console.error("Error adding queued ICE:", err);
            }
          }
          peer._queuedCandidates = []; // clear after flush
        }

        
        console.log("Remote description set for", fromId, peer.remoteDescription.sdp);
        console.log("Receivers after remote desc:", peer.getReceivers());

        // Answer handling
        if (isOffer) {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          console.log("Created answer", answer);
          socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: peer.localDescription })).then(() => console.log("sent answer: ", peer.localDescription));
          console.log(`Sent answer to ${fromId}`);
        }

      }

      // --- ICE handling ---
      else if (signal.ice) {
        try {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.ice)).then(() => console.log("added ICE Candidate: ", signal.ice));
            console.log(`Added ICE from ${fromId}`);
          } else {
            peer._queuedCandidates = peer._queuedCandidates || [];
            peer._queuedCandidates.push(signal.ice);
            console.log(`Queued ICE from ${fromId}`);
          }
        } catch (e) {
          console.error("ICE candidate error:", e);
        }
      }

    } catch (e) {
      console.error("Signaling error:", e);
      if (e.name.includes('InvalidStateError') || e.name.includes('InvalidAccessError')) {
        console.warn("Critical error detected - recreating connection");
        await handleRoleConflict(fromId);
      }
    }

  };

  // --- Connects the user to the Socket.IO backend & Registers all important event listeners. (used to exchange SDP/ICE Candidates & handle other events) ---
  let connectToSocketServer = () => {

    socketRef.current = io.connect(server_url, { secure: false });

    // handle webRTC connection between peers
    socketRef.current.on("signal", gotMessageFromServer); // sending SDP - ICE info

    // handle after connection created(join-call, chat-message, user-left, user-joined)
    socketRef.current.on("connect", () => {

      socketIdRef.current = socketRef.current.id; // storing socketID
      const roomId = window.location.href; // using the website link as roomId (meeting ID)

      socketRef.current.emit("join-call", roomId, username); 

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-joined", async (id, clients, peerUsername) => {
        
        console.log("User joined:", id);

        if (!Array.isArray(clients)) clients = [clients]; // make sure clients is an array 
        if (id === socketIdRef.current) return; // ignore yourself

        const existingIds = new Set(videos.map(v => v.socketId));

        for (const clientId of clients) {

          // skip yourself to recreate connection
          if (clientId === socketIdRef.current || existingIds.has(clientId)) continue;

          // Always (re)create connection safely
          const peer = await createPeerConnection(clientId, socketIdRef.current > clientId);

          peer.username = peerUsername;
          connections[clientId].username = peerUsername;

          if (peer.signalingState === "stable" && !peer.isMakingOffer) {
            try {
              peer.isMakingOffer = true; // prevent re-entrant offers

              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);

              socketRef.current.emit("signal", clientId, JSON.stringify({ sdp: peer.localDescription }));
              console.log(`[user-joined] Sent manual offer to ${clientId}`);
            } catch (err) {
              console.error("Manual offer error:", err);
            } finally {
              peer.isMakingOffer = false;
            }
          }
        }

      });

      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((v) => v.socketId !== id));
        videoRef.current = videoRef.current.filter((v) => v.socketId !== id);

        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });

    });

  };

  // --- Enables video/audio state and calls connectToSocketServer() ---
  let getMedia = () => {
    setVideo(videoAvailable); // set video available befor connecting to socket
    setAudio(audioAvailable); // set audio available before connecting to socket
    connectToSocketServer();
  };

  //  ---	Starts the whole process(logic we defined above) — triggered when user clicks "Connect" button ---
  let connect = () => {
    setAskForUsername(false);
    getMedia(); 
  };

return (
  <div>
    {askForUsername ? (
      <div>
        <h2>Enter into Lobby</h2>
        <TextField
          id="outlined-basic"
          label="Username"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button variant="contained" onClick={connect} disabled={!username}>
          Connect
        </Button>
        <div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "600px", marginTop: "1em" }}
          />
        </div>
      </div>
    ) : (
      <div className={styles.meetVideoContainer}>

        {/* user video */}
          <div>
            <video
              className={styles.meetUserVideo}
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
            />
          </div>

        {/* peer video & chatbox */}
        <div>

          {/* video and control pannel */}
          <div className={styles.videoWrapper}>

            {/* peer videos */}
            <div className={`${styles.conferenceView} ${videos.length >= 4 ? styles.twoRowGrid : ''}`}>
              {videos.map((video) => (
                  <PeerVideo  key={video.key}
                    stream={video.stream}
                    muted={video.muted}
                    username={video.username}
                  />
              ))}
            </div>

            {/* chat box */}
            {showModal && (
              <div className={styles.chatRoom}>
                <div className={styles.chatContainer}>
                  <h3 style={{ fontSize: "20px", marginBottom: "1rem" }}>Chat messages</h3>
                  <hr style={{opacity: "0.5", marginBottom: "1rem"}}></hr>
                  <div className={styles.chatDisplay}>
                    {messages.length > 0 ? (
                      messages.map((item, index) => (
                        <div key={index} style={{ marginBottom: "20px" }}>
                          <span style={{ display: "flex", alignItems: "baseline" }}>
                            <b><p style={{fontWeight: "500", fontSize: "14.7px"}}>{item.sender}</p></b>&nbsp;&nbsp;
                            <p style={{fontSize: "small"}}>{item.time}</p>
                          </span>
                          <p style={{fontSize: "15.7px"}}>{item.data}</p>
                        </div>
                      ))
                    ) : (
                      <p>No messages yet</p>
                    )}
                    <div ref={scrollAnchor} />
                  </div>
                  <div className={styles.chatInput}>
                    <TextField
                      sx={{
                        width: "315px",
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "50px",
                          "&.Mui-focused fieldset": {
                            border: "1px solid gray", 
                          },
                        },
                        "& fieldset": {
                          borderRadius: "50px",
                        },
                        "& input": {
                          padding: "15px 25px",
                        },
                      }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="send your chat"
                    />
                    <button
                      onClick={sendMessage}
                      style={{ width: "fit-content", onHover }}
                    >
                      <SendIcon style={{ color: "gray", fontSize: "20px" }} />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* button box */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: '1rem', fontWeight: '500', opacity: "0.8", color: "white", left: "1.5rem", bottom: "1.5rem", position: "absolute" }}>
              {time}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;{socketIdRef.current}
            </div>
            <div className={styles.buttonContainer}>
              <IconButton id={video ? styles.btn1 : styles.btn2} onClick={handleVideo} style={{ color: "white" }}>
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
              <IconButton id={audio ? styles.btn1 : styles.btn2} onClick={handleAudio} style={{ color: "white" }}>
                {audio ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              {screenAvailable && (
                <IconButton id={screen ? styles.btn1 : styles.btn2} onClick={handleScreen} style={{ color: "white" }}>
                  {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                </IconButton>
              )}
              <Badge badgeContent={newMessages} max={999} color="secondary">
                <IconButton
                  id={styles.btn1}
                  onClick={() => setShowModal(!showModal)}
                  style={{ color: "white" }}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
              <IconButton id={styles.callEndBtn} onClick={handleCallEnd} style={{ color: "white" }}>
                <CallEndIcon />
              </IconButton>
            </div>
          </div>

        </div>


      </div>
    )}
  </div>
);

}


export default VideoMeetComponent;