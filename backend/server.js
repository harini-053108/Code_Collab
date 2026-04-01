/**
 * ============================================================
 *  Collaborative Code Editor - Backend Server
 *  Tech: Node.js + Express + Socket.io + MongoDB (Mongoose)
 * ============================================================
 */

// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
console.log("API KEY:", process.env.JUDGE0_API_KEY);
// ─────────────────────────────────────────────
//  App & Server Setup
// ─────────────────────────────────────────────
const app = express();
const server = http.createServer(app); // wrap express with http so Socket.io can attach

// Socket.io server with CORS config
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ─────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json()); // parse JSON request bodies

// ─────────────────────────────────────────────
//  MongoDB Connection
// ─────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/code-editor";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.warn("⚠️  MongoDB not connected (optional):", err.message));

// ─────────────────────────────────────────────
//  Mongoose Schema & Model  (optional storage)
// ─────────────────────────────────────────────

/**
 * Room Schema:
 *  - roomId   : unique room identifier
 *  - code     : latest code snapshot in the room
 *  - language : selected language
 *  - createdAt: timestamp
 */
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, default: "// Start coding here...\n" },
  language: { type: String, default: "javascript" },
  createdAt: { type: Date, default: Date.now },
});

const Room = mongoose.model("Room", roomSchema);

// ─────────────────────────────────────────────
//  In-Memory Store  (works even without MongoDB)
//  Stores: roomId -> { code, language, users }
// ─────────────────────────────────────────────
const rooms = {}; // e.g. rooms["abc123"] = { code: "...", language: "js", users: [...] }

// ─────────────────────────────────────────────
//  REST API Routes
// ─────────────────────────────────────────────

/** Health check */
app.get("/", (req, res) => {
  res.json({ message: "🚀 Collaborative Code Editor API is running!" });
});

/**
 * POST /api/room/create
 * Creates a new room with a unique ID
 */
app.post("/api/room/create", async (req, res) => {
  try {
    const roomId = uuidv4().slice(0, 8).toUpperCase(); // short 8-char ID e.g. "A1B2C3D4"
    const newRoom = {
      code: "// Welcome! Start coding here...\nconsole.log('Hello, World!');\n",
      language: "javascript",
      users: [],
    };

    // Save to in-memory store
    rooms[roomId] = newRoom;

    // Also try to save to MongoDB (optional)
    try {
      await Room.create({ roomId, code: newRoom.code, language: newRoom.language });
    } catch (dbErr) {
      // MongoDB might not be running — that's OK for development
    }

    res.json({ success: true, roomId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/room/:roomId
 * Fetches existing room data
 */
app.get("/api/room/:roomId", async (req, res) => {
  const { roomId } = req.params;

  // Check in-memory first
  if (rooms[roomId]) {
    return res.json({ success: true, room: rooms[roomId] });
  }

  // Try MongoDB as fallback
  try {
    const room = await Room.findOne({ roomId });
    if (room) {
      // Re-populate in-memory
      rooms[roomId] = { code: room.code, language: room.language, users: [] };
      return res.json({ success: true, room: rooms[roomId] });
    }
  } catch (dbErr) {
    // MongoDB might not be running
  }

  res.status(404).json({ success: false, message: "Room not found" });
});

/**
 * POST /api/execute
 * Executes code using the Judge0 CE public API
 * Docs: https://ce.judge0.com/
 *
 * NOTE: For production, sign up for a RapidAPI key.
 *       For development, we use the free public endpoint.
 */
app.post("/api/execute", async (req, res) => {
  const { code, language } = req.body;

  // Map our language names to Judge0 language IDs
  const languageMap = {
    javascript: 63, // Node.js
    python: 71,     // Python 3
    java: 62,       // Java
    cpp: 54,        // C++ (GCC 9.2.0)
    c: 50,          // C (GCC 9.2.0)
    typescript: 74, // TypeScript
  };

  const languageId = languageMap[language] || 63; // default to JS

  try {
    // Step 1: Submit code to Judge0
    const submitResponse = await axios.post(
      "https://judge0-ce.p.rapidapi.com/submissions",
      {
        source_code: code,
        language_id: languageId,
        stdin: "",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.JUDGE0_API_KEY || "demo",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        params: { base64_encoded: "false", wait: "true" }, // wait=true for instant result
      }
    );

    const result = submitResponse.data;

    // Step 2: Return output or error
    const output =
      result.stdout ||
      result.stderr ||
      result.compile_output ||
      "No output";

    res.json({
      success: true,
      output,
      status: result.status?.description || "Unknown",
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    // If API key is not set, return a friendly mock response
    if (!process.env.JUDGE0_API_KEY || process.env.JUDGE0_API_KEY === "demo") {
      return res.json({
        success: true,
        output:
          "⚠️  Code execution is in demo mode.\n" +
          "To enable real execution:\n" +
          "1. Get a free API key from https://rapidapi.com/judge0-official/api/judge0-ce\n" +
          "2. Add JUDGE0_API_KEY=your_key to backend/.env\n\n" +
          "Your code was received successfully!",
        status: "Demo Mode",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
//  Socket.io — Real-Time Collaboration
// ─────────────────────────────────────────────

/**
 * Socket events:
 *  Client -> Server:
 *    "join-room"      : { roomId, username }
 *    "code-change"    : { roomId, code }
 *    "language-change": { roomId, language }
 *    "leave-room"     : { roomId }
 *
 *  Server -> Client:
 *    "room-joined"    : { code, language, users }
 *    "code-update"    : { code }
 *    "language-update": { language }
 *    "user-joined"    : { users, username }
 *    "user-left"      : { users, username }
 *    "error"          : { message }
 */

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── Join Room ──────────────────────────────
  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId || !username) {
      socket.emit("error", { message: "Room ID and username are required." });
      return;
    }

    // Normalize room ID (uppercase)
    const normalizedId = roomId.trim().toUpperCase();

    // Create room in memory if it doesn't exist yet
    if (!rooms[normalizedId]) {
      rooms[normalizedId] = {
        code: "// Start coding here...\nconsole.log('Hello, World!');\n",
        language: "javascript",
        users: [],
      };
    }

    const room = rooms[normalizedId];

    // Add user to room's user list (avoid duplicates by socket id)
    room.users = room.users.filter((u) => u.socketId !== socket.id);
    room.users.push({ socketId: socket.id, username });

    // Join Socket.io room (broadcasts go to this group)
    socket.join(normalizedId);

    // Send current code & user list to the newly joined user
    socket.emit("room-joined", {
      code: room.code,
      language: room.language,
      users: room.users.map((u) => u.username),
    });

    // Notify everyone else in the room
    socket.to(normalizedId).emit("user-joined", {
      users: room.users.map((u) => u.username),
      username,
    });

    console.log(`👤 ${username} joined room ${normalizedId}`);
  });

  // ── Code Change ────────────────────────────
  socket.on("code-change", ({ roomId, code }) => {
    const normalizedId = roomId?.trim().toUpperCase();
    if (!rooms[normalizedId]) return;

    // Update in-memory code snapshot
    rooms[normalizedId].code = code;

    // Broadcast to EVERYONE in the room EXCEPT the sender
    socket.to(normalizedId).emit("code-update", { code });

    // Optionally sync to MongoDB every 30 seconds (debounce in production)
    Room.findOneAndUpdate({ roomId: normalizedId }, { code }).catch(() => {});
  });

  // ── Language Change ────────────────────────
  socket.on("language-change", ({ roomId, language }) => {
    const normalizedId = roomId?.trim().toUpperCase();
    if (!rooms[normalizedId]) return;

    rooms[normalizedId].language = language;

    // Broadcast language change to all other users
    socket.to(normalizedId).emit("language-update", { language });
  });

  // ── Leave Room ─────────────────────────────
  socket.on("leave-room", ({ roomId }) => {
    handleDisconnect(socket, roomId?.trim().toUpperCase());
  });

  // ── Disconnect (browser closed / network lost) ─
  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);

    // Find which room this socket was in and clean up
    Object.keys(rooms).forEach((roomId) => {
      if (rooms[roomId].users.some((u) => u.socketId === socket.id)) {
        handleDisconnect(socket, roomId);
      }
    });
  });
});

/**
 * Helper: remove a user from a room and notify others
 */
function handleDisconnect(socket, roomId) {
  if (!roomId || !rooms[roomId]) return;

  const room = rooms[roomId];
  const leavingUser = room.users.find((u) => u.socketId === socket.id);

  // Remove user
  room.users = room.users.filter((u) => u.socketId !== socket.id);

  if (leavingUser) {
    // Notify remaining users
    io.to(roomId).emit("user-left", {
      users: room.users.map((u) => u.username),
      username: leavingUser.username,
    });
    console.log(`👋 ${leavingUser.username} left room ${roomId}`);
  }

  // Clean up empty rooms from memory
  if (room.users.length === 0) {
    delete rooms[roomId];
    console.log(`🗑️  Room ${roomId} removed (empty)`);
  }

  socket.leave(roomId);
}

// ─────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections\n`);
});
