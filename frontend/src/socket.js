/**
 * socket.js
 * Creates and exports a single Socket.io client instance.
 * We use a singleton pattern so all components share the same connection.
 */

import { io } from "socket.io-client";

// Connect to our backend server
// In production, replace with your deployed server URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: false,        // Don't connect until we explicitly call socket.connect()
  reconnectionAttempts: 5,   // Try to reconnect 5 times before giving up
  reconnectionDelay: 1000,   // Wait 1 second between reconnection attempts
  transports: ["websocket"], // Prefer WebSocket over long-polling
});

export default socket;
