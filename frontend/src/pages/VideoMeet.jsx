import React from "react";
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
  let socketIdRef = useRef(); // socketID instance
  let localVideoRef = useRef(); // local video instance(User video)
  let userMediaStreamRef = useRef(); // local video/audio stream instance
  const peerNames = useRef({});

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
  const receivedStreams = new Set();

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  // --- Clear stream chache & sockets ---
  useEffect(() => {
    return () => {
      console.log("Cleaning up resources...");

      // 1. Stop Media Streams
      [localVideoRef.current?.srcObject, userMediaStreamRef.current, window.localStream]
        .filter(Boolean)
        .forEach(stream => {
          stopMediaTracks(stream);
        });

      // 2. Close Peer Connections
      Object.values(connections).forEach(peer => {
        try {
          peer.close();
        } catch (e) {
          console.error("Error closing peer:", e);
        }
      });
      connections = {};

      // 3. Socket Cleanup
      if (socketRef.current) {
        socketRef.current.off?.();
        socketRef.current.disconnect();
      }

      // 4. Reset Local State
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
        if (localVideoRef.current.srcObject !== userMediaStream) {
          localVideoRef.current.srcObject = userMediaStream;
        }

        localVideoRef.current.onloadedmetadata = () => {

          if (localVideoRef.current.paused) {
            localVideoRef.current
              .play()
              .catch((err) => console.error("Playback error:", err));
          }
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
        if (window.localStream && window.localStream !== stream) {
          stopMediaTracks(window.localStream);
        }
      }
    } catch (e) {
      console.log("getTracks error:", e);
    }

    // if there is no stream add the stream 
    window.localStream = stream; // save new stream
    if (localVideoRef.current.srcObject !== stream) {
      localVideoRef.current.srcObject = stream;
    } // display stream

    // play the stream after adding
    if (localVideoRef.current) {
      localVideoRef.current.onloadedmetadata = () => {
        if (localVideoRef.current.paused) {
          localVideoRef.current
          .play()
          .catch((e) => console.error("Playback error:", e));
        }
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
            if (localVideoRef.current.srcObject !== window.localStream) {
              localVideoRef.current.srcObject = window.localStream;
            }
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
        if (localVideoRef.current.srcObject !== stream) {
          localVideoRef.current.srcObject = stream;
        }
        localVideoRef.current.onloadedmetadata = () => {
          if (localVideoRef.current.paused) {
            localVideoRef.current
            .play()
            .catch((err) => console.error("playback error:", err));
          }
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
      if (localVideoRef.current.srcObject !== window.localStream) {
        localVideoRef.current.srcObject = window.localStream;
      }
    }
  };

  let getDisplayMediaSuccess = async (stream) => {
    // stop old stream
    if (window.localStream && window.localStream !== stream) {
      stopMediaTracks(window.localStream);
    }

    window.localStream = stream;

    // Set local video
    if (localVideoRef.current.srcObject !== stream) {
      localVideoRef.current.srcObject = stream;
    }

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
          if (window.localStream && window.localStream !== stream) {
            stopMediaTracks(window.localStream);
          } // stop the old screen stream, not the cam stream
          window.localStream = camStream;
          if (localVideoRef.current.srcObject !== camStream) {
            localVideoRef.current.srcObject = camStream;
          }
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
          if (window.localStream && window.localStream !== camStream) {
            stopMediaTracks(window.localStream);
          }
          window.localStream = camStream;
          if (localVideoRef.current.srcObject !== camStream) {
            localVideoRef.current.srcObject = camStream;
          }
          replaceStreamTracks(camStream);
        })
        .catch(console.error);
      return;
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then((stream) => {
          if (window.localStream && window.localStream !== stream) {
            stopMediaTracks(window.localStream);
          } // stop only after permission
          getDisplayMediaSuccess(stream); // proceed normally
        })
        .catch((e) => {
          console.error("Screen share error:", e);
          setScreen(false);
          getUserMedia(); // fallback to camera if denied
        });
    }
  };

  // --- Check for permission automatically ---
  useEffect(() => {
    getPermissions();
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

  const replaceStreamTracks = (newStream) => {
    Object.keys(connections).forEach((id) => {
      if (id === socketIdRef.current) return;

      const senderVideo = connections[id]?.getSenders?.().find(s => s.track?.kind === "video");
      const senderAudio = connections[id]?.getSenders?.().find(s => s.track?.kind === "audio");

      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];

      if (senderVideo && senderVideo.track !== newVideoTrack) {
        senderVideo.replaceTrack(newVideoTrack).catch(console.error);
      }
      if (senderAudio && senderAudio.track !== newAudioTrack) {
        senderAudio.replaceTrack(newAudioTrack).catch(console.error);
      }
    });
  };

  const handleVideo = async () => {
    try {
      if (video) return; 

      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = camStream.getVideoTracks()[0];

      if (!videoTrack) {
        console.error("No video track received.");
        return;
      }

      videoTrack.enabled = true;

      const newStream = new MediaStream([
        videoTrack,
        ...window.localStream.getAudioTracks()
      ]);

      // Update local video view
      if (localVideoRef.current) {
        if (localVideoRef.current.srcObject !== newStream) {
          localVideoRef.current.srcObject = newStream;
          localVideoRef.current.play().catch(console.error);
        }
      }

      // Replace localStream and inform peers
      window.localStream = newStream;
      replaceStreamTracks(newStream);
      setVideo(true);

      socketRef.current.emit("video-toggle", {
        socketId: socketIdRef.current,
        enabled: true,
      });

      console.log("Tracks in stream:", window.localStream?.getTracks().map(t => `${t.kind}: ${t.label}`));

    } catch (err) {
      console.error("handleVideo error:", err);
    }
  };

  const handleVideoOff = () => {
    const silentVideo = black();
    const newStream = new MediaStream([
      silentVideo,
      ...window.localStream.getAudioTracks(),
    ]);

    silentVideo.enabled = false;

    window.localStream = newStream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
      localVideoRef.current.play().catch(console.error);
    }

    replaceStreamTracks(newStream);
    setVideo(false);

    socketRef.current.emit("video-toggle", {
      socketId: socketIdRef.current,
      enabled: false,
    });
  };

  const handleAudio = () => {
    const audioTrack = window.localStream?.getAudioTracks?.()[0];
    if (!audioTrack) return;

    const newEnabled = !audioTrack.enabled;
    audioTrack.enabled = newEnabled;
    setAudio(newEnabled);

    replaceStreamTracks(window.localStream);

    socketRef.current.emit("audio-toggle", {
      socketId: socketIdRef.current,
      enabled: newEnabled,
    });
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
      receivedStreams.clear();

      // 5. Navigate after cleanup
      setTimeout(() => route("/home"), 100);
    } catch (e) {
      console.error("Error ending call:", e);
      route("/home");
    }
  };

const PeerVideo = ({ stream, username, socketId, videoEnabled, audioEnabled }) => {
  const videoRef = useRef(null);

useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const handleMetadata = () => {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(err =>
              console.error(`Playback error for ${username}:`, err)
            );
          }
        }, 0); // short delay to avoid premature play call
      };
      videoRef.current.onloadedmetadata = handleMetadata;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
      }
    };
  }, [stream]);

  return (
    <div className={styles.peerVideoContainer}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!audioEnabled}
        style={{ width: '100%', backgroundColor: 'black' }}
      />
      <p>{username}</p>
    </div>
  );
};

const MemoPeerVideo = React.memo(PeerVideo, (prev, next) =>
  prev.socketId === next.socketId &&
  prev.audioEnabled === next.audioEnabled &&
  prev.videoEnabled === next.videoEnabled
);

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
  const createPeerConnection = async (peerId, isPolite, peerUsername) => {

    // prevent duplicate
    if (connections[peerId]) {
      console.warn(`Already have connection for ${peerId}`);
      return connections[peerId];
    }

    console.log("Creating new peer connection for:", peerId);


    const peer = new RTCPeerConnection(peerConfigConnections);
    peer.username = peerUsername || peerId;
    peerNames.current[peerId] = peer.username;

    peer.isPolite = isPolite;
    peer._queuedCandidates = [];
    peer.isMakingOffer = false;
    
    connections[peerId] = peer;
    // Track received from remote peer
    peer.ontrack = (event) => {

      console.log("ontrack triggered for peer:", peerId);
      console.log("event.streams:", event.streams);

      const stream = event.streams[0];
      const streamKey = `${peerId}-${stream.id}`; 

      if (receivedStreams.has(streamKey)) {
        console.warn("Stream already received, skipping duplicate:", streamKey);
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      console.log("🎥 videoTrack info:", {
        label: videoTrack?.label,
        enabled: videoTrack?.enabled,
        readyState: videoTrack?.readyState,
      });

      setTimeout(() => {
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== "live") {
          console.warn("Rejected non-live stream from", peerId);
          console.log("Stream tracks for", peerId, stream.getTracks().map(t => `${t.kind}:${t.readyState}`));
          return;
        }

        receivedStreams.add(streamKey);

        setVideos((prev) => {
          // Remove any video already from this peer (even if stream changed)
          const withoutDuplicate = prev.filter(v => v.socketId !== peerId);
          return [
            ...withoutDuplicate,
            {
              key: streamKey,
              socketId: peerId,
              stream,
              muted: false,
              username: peer.username || peerId,
              audioEnabled: audioTrack?.enabled ?? true,
              videoEnabled: videoTrack?.enabled ?? true
            }
          ];
        });


        console.log(`Received and set video for ${peerId}`);
      }, 100);
    };

    // Send local ICE candidates
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current.emit("signal", peerId, JSON.stringify({ ice: candidate }));
      }
    };
    
    // Add local tracks
    const localStream = localVideoRef.current?.srcObject;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
        console.log(`Added local ${track.kind} track to peer ${peerId}`);
      });
    } 

    // Negotiation
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

    return peer;
  };

  // --- Handle deeting peer stream if signal issue occured ---
  const handleRoleConflict = async (peerId) => {
    console.warn("Role conflict with", peerId);

    // 1. Clean up old connection
    try {
      if (connections[peerId]) {
        connections[peerId].close();
        delete connections[peerId];
      }
    } catch (e) {
      console.error("Error closing peer:", e);
    }

    // 2. Remove from UI
    setVideos(prev => prev.filter(v => v.socketId !== peerId));

    // 3. Wait a bit (jitter avoids race conditions)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // 4. Recreate full connection
    const peerUsername = peerNames.current[peerId] || peerId;
    const newPeer = await createPeerConnection(peerId, socketIdRef.current > peerId, peerUsername);
    newPeer._queuedCandidates = [];

    // Force new negotiation manually
    if (newPeer.signalingState === "stable" && !newPeer.isMakingOffer) {
      try {
        newPeer.isMakingOffer = true;
        const offer = await newPeer.createOffer();
        await newPeer.setLocalDescription(offer);
        socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: newPeer.localDescription }));
      } catch (e) {
        console.error("Renegotiation failed after role conflict:", e);
      } finally {
        newPeer.isMakingOffer = false;
      }
    }
  };

  // --- Handles incoming signaling messages from other peers via socket:(SDP/ICE Candidate) ---
  const gotMessageFromServer = async (fromId, rawMessage) => {
    console.log("gotMessageFromServer triggered from", fromId);

    if (fromId === socketIdRef.current) return; // skip yourself
    

    let signal;
    try {
      signal = JSON.parse(rawMessage);
    } catch (err) {
      console.error("Invalid JSON from", fromId, rawMessage);
      return;
    }
    
    try {

      console.log("Got signal from", fromId, signal.sdp?.type || "ICE");

      if (!peerNames.current[fromId]) peerNames.current[fromId] = fromId;
      const peerUsername = peerNames.current[fromId];
      // Always ensure peer exists
      const isPolite = socketIdRef.current > fromId;
      const peer = connections[fromId] || await createPeerConnection(fromId, isPolite, peerUsername);

      // --- SDP Handling ---
      if (signal.sdp) {

        const description = new RTCSessionDescription(signal.sdp);
        
        // State validation
        const isOffer = description.type === "offer";

        const offerCollision = isOffer &&
          (peer.isMakingOffer || peer.signalingState !== "stable");

        if (offerCollision) {
          console.warn("Offer collision with", fromId);

          if (!peer.isPolite) {
            console.warn("Offer collision: impolite peer ignoring offer from", fromId);
            await handleRoleConflict(fromId);
            return;
          }

          // Rollback and wait for their offer
          try {
            await peer.setLocalDescription({ type: "rollback" });
            console.log("Rolled back due to offer collision");
          } catch (e) {
            console.error("Rollback failed", e);
          }

        }

        if (
          peer.remoteDescription &&
          peer.remoteDescription.type === description.type &&
          peer.remoteDescription.sdp === description.sdp
        ) {
          console.log("Duplicate remote SDP, skipping");
          return;
        }

        if (
          description.type === "answer" &&
          peer.signalingState === "stable"
        ) {
          console.warn("Received an answer but we're already stable — ignoring late answer");
          return;
        }

        try {
          await peer.setRemoteDescription(description);
          console.log(`setRemoteDescription(${description.type}) from ${fromId}`);
        } catch (e) {
          console.error("setRemoteDescription failed:", e);
          await handleRoleConflict(fromId);
          return;
        }

        if (isOffer) {
          try {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: peer.localDescription }));
            console.log(`Sent answer to ${fromId}`);
          } catch (e) {
            console.error("Failed to create/send answer:", e);
          }
        }

        const flushIce = async () => {
          if (peer.signalingState !== "stable") {
            setTimeout(flushIce, 100);
            return;
          }
          for (const candidate of peer._queuedCandidates) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("Error adding queued ICE:", err);
            }
          }
          peer._queuedCandidates = [];
        };
        flushIce();

      }

      // --- ICE handling ---
      else if (signal.ice) {  
        try {
          if (peer.remoteDescription && peer.remoteDescription.type) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.ice)).then(() => console.log("added ICE Candidate: ", signal.ice));
            console.log(`Added ICE from ${fromId}`);
          } else {
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

      socketRef.current.on("existing-users", async (users) => {
        for (const { id: clientId, username: peerUsername } of users) {
          if (clientId === socketIdRef.current || connections[clientId]) continue;

          const peer = await createPeerConnection(clientId, socketIdRef.current > clientId, peerUsername);

          await new Promise(res => setTimeout(res, 200));

          if (peer.signalingState === "stable" && !peer.isMakingOffer) {
            try {
              peer.isMakingOffer = true;
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              socketRef.current.emit("signal", clientId, JSON.stringify({ sdp: peer.localDescription }));
            } catch (err) {
              console.error("Offer error (existing-users):", err);
            } finally {
              peer.isMakingOffer = false;
            }
          }
        }
      });

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("video-toggle", ({ socketId, enabled }) => {
        setVideos(prev =>
          prev.map(v => v.socketId === socketId ? { ...v, videoEnabled: enabled } : v)
        );
      });

      socketRef.current.on("audio-toggle", ({ socketId, enabled }) => {
        setVideos((prev) =>
          prev.map((v) =>
            v.socketId === socketId ? { ...v, audioEnabled: enabled } : v
          )
        );
      });

      socketRef.current.on("user-joined", async (id, allClientIds, peerUsername) => {
        if (id === socketIdRef.current || connections[id]) return;

        console.log("New user joined:", id, peerUsername);

        peerNames.current[id] = peerUsername;

        const peer = await createPeerConnection(id, socketIdRef.current > id, peerUsername);

        // Wait a bit to ensure tracks are properly attached
        await new Promise(res => setTimeout(res, 200));

        if (
  peer.signalingState === "stable" &&
  !peer.isMakingOffer &&
  peer.isPolite // ONLY the polite peer should initiate
) {
  try {
    peer.isMakingOffer = true;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current.emit("signal", id, JSON.stringify({ sdp: peer.localDescription }));
  } catch (err) {
    console.error("Offer error (new joiner):", err);
  } finally {
    peer.isMakingOffer = false;
  }
} else {
  console.warn(
    `Skipping offer to ${id} — signalingState=${peer.signalingState}, isMakingOffer=${peer.isMakingOffer}, isPolite=${peer.isPolite}`
  );
}

      });

      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((v) => v.socketId !== id));

        if (connections[id]) {
          connections[id].close();
          delete connections[id];
          delete peerNames.current[id];
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
              {videos.map(({ stream, username, socketId, videoEnabled, audioEnabled, key }) => (
                <MemoPeerVideo
                  key={key}
                  stream={stream}
                  username={username}
                  socketId={socketId}
                  videoEnabled={videoEnabled}
                  audioEnabled={audioEnabled}
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
                      style={{ width: "fit-content"}}
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
              <IconButton id={video ? styles.btn1 : styles.btn2} onClick={video ? handleVideoOff : handleVideo} style={{ color: "white" }}>
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