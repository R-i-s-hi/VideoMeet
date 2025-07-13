import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import {createServer} from 'node:http';

import {connectToSocket} from './controllers/SocketManager.js';
import userRoutes from './routes/RoutesManager.js';

const app = express();
const server = createServer(app); // Create HTTP server
const io = connectToSocket(server); // Initialize Socket.IO and return the io instance


mongoose.connect(process.env.DB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

app.set("port", (process.env.PORT || 5000));
app.use(cors());
app.use(express.json({limit: "40kb"}));
app.use(express.urlencoded({extended: true, limit: "40kb"}));


app.use('/api/v1/users', userRoutes); 


server.listen(app.get("port"), () => {
  console.log(`Server is running on http://localhost:${app.get("port")}`);
});