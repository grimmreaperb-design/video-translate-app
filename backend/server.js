const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({ 
    message: "Video Translate Backend is running!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Ou restrinja ao domínio da Vercel
    methods: ["GET", "POST"],
  },
  path: "/socket.io", // importante para compatibilidade
});

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });

  // Protocolo de signaling WebRTC
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("offer", ({ to, offer }) => {
    socket.to(to).emit("offer", { from: socket.id, offer });
    console.log(`Offer sent from ${socket.id} to ${to}`);
  });

  socket.on("answer", ({ to, answer }) => {
    socket.to(to).emit("answer", { from: socket.id, answer });
    console.log(`Answer sent from ${socket.id} to ${to}`);
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
    console.log(`ICE candidate sent from ${socket.id} to ${to}`);
  });

  // Compatibilidade com o protocolo atual do frontend
  socket.on("webrtc-offer", (data) => {
    socket.to(data.to).emit("webrtc-offer", {
      offer: data.offer,
      from: socket.id
    });
    console.log(`WebRTC Offer sent from ${socket.id} to ${data.to}`);
  });

  socket.on("webrtc-answer", (data) => {
    socket.to(data.to).emit("webrtc-answer", {
      answer: data.answer,
      from: socket.id
    });
    console.log(`WebRTC Answer sent from ${socket.id} to ${data.to}`);
  });

  socket.on("webrtc-ice-candidate", (data) => {
    socket.to(data.to).emit("webrtc-ice-candidate", {
      candidate: data.candidate,
      from: socket.id
    });
    console.log(`WebRTC ICE candidate sent from ${socket.id} to ${data.to}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
