// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const userRoutes = require('./routes/user');
const meetingRoutes = require('./routes/meeting');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('join-room', ({ roomId, username, isAdmin }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add({ id: socket.id, username, isAdmin, muted: false, handRaised: false, videoOn: true });
    io.to(roomId).emit('user-joined', Array.from(rooms.get(roomId)));
  });

  socket.on('leave-room', ({ roomId }) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }
    socket.leave(roomId);
    io.to(roomId).emit('user-left', socket.id);
  });

  socket.on('toggle-mute', ({ roomId, muted }) => {
    if (rooms.has(roomId)) {
      const user = Array.from(rooms.get(roomId)).find(u => u.id === socket.id);
      if (user) {
        user.muted = muted;
        io.to(roomId).emit('user-muted', { id: socket.id, muted });
      }
    }
  });

  socket.on('toggle-video', ({ roomId, videoOn }) => {
    if (rooms.has(roomId)) {
      const user = Array.from(rooms.get(roomId)).find(u => u.id === socket.id);
      if (user) {
        user.videoOn = videoOn;
        io.to(roomId).emit('user-video-toggle', { id: socket.id, videoOn });
      }
    }
  });

  socket.on('toggle-hand', ({ roomId, handRaised }) => {
    if (rooms.has(roomId)) {
      const user = Array.from(rooms.get(roomId)).find(u => u.id === socket.id);
      if (user) {
        user.handRaised = handRaised;
        io.to(roomId).emit('user-hand-raised', { id: socket.id, handRaised });
      }
    }
  });

  socket.on('admin-mute-all', ({ roomId }) => {
    if (rooms.has(roomId)) {
      const users = rooms.get(roomId);
      users.forEach(user => {
        user.muted = true;
      });
      io.to(roomId).emit('all-users-muted');
    }
  });

  socket.on('admin-unmute-all', ({ roomId }) => {
    if (rooms.has(roomId)) {
      const users = rooms.get(roomId);
      users.forEach(user => {
        user.muted = false;
      });
      io.to(roomId).emit('all-users-unmuted');
    }
  });

  socket.on('send-message', ({ roomId, message, username }) => {
    io.to(roomId).emit('new-message', { id: socket.id, message, username });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    rooms.forEach((users, roomId) => {
      const user = Array.from(users).find(u => u.id === socket.id);
      if (user) {
        users.delete(user);
        io.to(roomId).emit('user-left', socket.id);
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

