/**
 * socket.js
 * Creates and exports a single Socket.io client instance.
 * We use a singleton pattern so all components share the same connection.
 */

import { io } from "socket.io-client";

const SOCKET_URL = "https://code-collab-z7ux.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket"],
});

export default socket;
