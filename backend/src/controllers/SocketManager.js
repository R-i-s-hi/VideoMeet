import { Server } from 'socket.io';

let connections = {};  // { path: [socketId1, socketId2, ...], path: [socketId1, socketId2, ...], ... }
let messages = {};     // { path: [{ sender, data, socket-id-sender }, path: [{ sender, data, socket-id-sender }, ...] }
let timeOnline = {};   // { socketId: Date }

let usernameToSocketId = {};
let socketIdToUsername = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {

    console.log("New connection:", socket.id);

    socket.on("signal", (toId, data) => {

      const recipientSocket = io.sockets.sockets.get(toId);
      if (!recipientSocket) {
        console.warn("Recipient socket not found for:", toId);
        return;
      }

      console.log(`Forwarding signal from ${socket.id} to ${toId}`);
      io.to(toId).emit("signal", socket.id, data);
    });

    socket.on("join-call", (path, username) => {

      console.log(`${username} joined room ${path}`);

      usernameToSocketId[username] = socket.id;
      socketIdToUsername[socket.id] = username;

      if (!connections[path]) connections[path] = [];
      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();
      socket.data.username = username;

      const currentClients = connections[path];

      // Notify others
      currentClients.forEach((peerId) => {

        // notify other except himself
        if (peerId !== socket.id) {
          
          // Notify existing peer that a new user (socket.id) joined
          io.to(peerId).emit("user-joined", socket.id, currentClients, username); 
        }
      });


      // Notify the joining user about existing users
      // Send existing users to the joining user in a single payload
      const existingUsers = currentClients
        .filter(id => id !== socket.id)
        .map(peerId => {
          const peerSocket = io.sockets.sockets.get(peerId);
          const peerUsername = peerSocket?.data?.username || "Guest";
          return { id: peerId, username: peerUsername };
        });

      io.to(socket.id).emit("existing-users", existingUsers);


      // Send chat history
      if (!messages[path]) messages[path] = [];
      messages[path].forEach(({ data, sender, "socket-id-sender": sid }) => {
        io.to(socket.id).emit("chat-message", data, sender, sid);
      });
    });

    socket.on("chat-message", (data, sender, time) => {
      const [roomKey] = Object.entries(connections).find(([, ids]) =>
        ids.includes(socket.id)
      ) || [];

      if (!roomKey) return;

      if (!messages[roomKey]) messages[roomKey] = [];
      messages[roomKey].push({
        sender,
        data,
        time,
        "socket-id-sender": socket.id,
      });

      connections[roomKey].forEach((peerId) => {
        io.to(peerId).emit("chat-message", data, sender, time, socket.id);
      });
    });

    socket.on("video-toggle", ({ socketId, enabled }) => {
      const [roomKey] = Object.entries(connections).find(([, ids]) =>
        ids.includes(socket.id)
      ) || [];

      if (!roomKey) return;

      connections[roomKey].forEach(peerId => {
        if (peerId !== socket.id) {
          io.to(peerId).emit("video-toggle", {
            socketId,
            enabled
          });
        }
      });
    });


    socket.on("leave-call", () => {
      // Find which room the user is in
      const [roomKey] = Object.entries(connections).find(([, ids]) => 
        ids.includes(socket.id)
      ) || [];

      if (roomKey) {
        // 1. Remove user from connections
        connections[roomKey] = connections[roomKey].filter(id => id !== socket.id);
        
        // 2. Notify remaining participants
        socket.to(roomKey).emit("user-left", socket.id);
        
        // 3. Cleanup empty rooms
        if (connections[roomKey].length === 0) {
          delete connections[roomKey];
          delete messages[roomKey]; // Clear chat history if room is empty
        }
      }

      const username = socketIdToUsername[socket.id];
      delete usernameToSocketId[username];
      delete socketIdToUsername[socket.id];
      delete timeOnline[socket.id];

      // 4. Force immediate disconnect
      socket.disconnect(true);
    });

    socket.on("disconnect", () => {

      const username = socketIdToUsername[socket.id];
      console.log("Disconnected:", socket.id, username);

      const joinTime = timeOnline[socket.id];
      delete usernameToSocketId[username];
      delete socketIdToUsername[socket.id];
      delete timeOnline[socket.id];

      for (const [room, ids] of Object.entries(connections)) {
        if (ids.includes(socket.id)) {
          connections[room] = ids.filter(id => id !== socket.id);
          connections[room].forEach((peerId) => {
            io.to(peerId).emit("user-left", socket.id);
          });

          if (connections[room].length === 0) {
            delete messages[room];
            delete connections[room];
          }
          break;
        }
      }
    });

  });

  return io;

};