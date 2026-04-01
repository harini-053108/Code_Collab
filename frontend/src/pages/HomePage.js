/**
 * HomePage.js
 * Landing page with two options:
 *   1. Create a new room (generates unique ID)
 *   2. Join an existing room (enter Room ID)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./HomePage.css";

const HomePage = () => {
  // State for the "Join Room" input field
  const [joinRoomId, setJoinRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // React Router hook for navigation
  const navigate = useNavigate();

  /**
   * Handle "Create Room" button click
   * Calls the backend API to generate a new Room ID
   */
  const handleCreateRoom = async () => {
    if (!username.trim()) {
      toast.error("Please enter your name first!");
      return;
    }

    setIsCreating(true);
    try {
      const response = await axios.post("/api/room/create");
      const { roomId } = response.data;

      // Copy Room ID to clipboard for easy sharing
      navigator.clipboard.writeText(roomId).catch(() => {});
      toast.success(`Room created! ID copied: ${roomId}`);

      // Navigate to the editor page with the new Room ID
      // Pass username via location state
      navigate(`/editor/${roomId}`, { state: { username: username.trim() } });
    } catch (err) {
      toast.error("Failed to create room. Is the backend running?");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle "Join Room" button click
   * Validates the Room ID and navigates to the editor
   */
  const handleJoinRoom = (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Please enter your name!");
      return;
    }
    if (!joinRoomId.trim()) {
      toast.error("Please enter a Room ID!");
      return;
    }

    // Normalize Room ID to uppercase
    const normalizedId = joinRoomId.trim().toUpperCase();
    navigate(`/editor/${normalizedId}`, { state: { username: username.trim() } });
  };

  return (
    <div className="home-container">
      {/* Animated background blobs */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      {/* Header */}
      <header className="home-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">CodeSync</span>
        </div>
        <p className="logo-tagline">Real-time collaborative coding</p>
      </header>

      {/* Main Card */}
      <main className="home-main">
        <div className="home-card">
          <h1 className="card-title">Start Coding Together</h1>
          <p className="card-subtitle">
            Create a room and share the ID with your teammates,<br />
            or join an existing room instantly — no signup needed.
          </p>

          {/* Username input (shared for both create & join) */}
          <div className="input-group">
            <label className="input-label">👤 Your Name</label>
            <input
              className="input"
              type="text"
              placeholder="Enter your display name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* Divider */}
          <div className="section-divider">
            <span className="divider-line" />
            <span className="divider-text">Choose an action</span>
            <span className="divider-line" />
          </div>

          {/* Action Cards */}
          <div className="action-grid">
            {/* CREATE ROOM */}
            <div className="action-card create-card">
              <div className="action-icon">🚀</div>
              <h3>Create Room</h3>
              <p>Start a new coding session and invite others with your Room ID.</p>
              <button
                className="btn btn-primary w-full"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <span className="spinner" /> Creating...
                  </>
                ) : (
                  "✨ Create New Room"
                )}
              </button>
            </div>

            {/* JOIN ROOM */}
            <div className="action-card join-card">
              <div className="action-icon">🔗</div>
              <h3>Join Room</h3>
              <p>Enter an existing Room ID to join a live coding session.</p>
              <form onSubmit={handleJoinRoom} className="join-form">
                <input
                  className="input"
                  type="text"
                  placeholder="Enter Room ID (e.g. A1B2C3D4)"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
                />
                <button type="submit" className="btn btn-success w-full" style={{ marginTop: "0.75rem" }}>
                  → Join Room
                </button>
              </form>
            </div>
          </div>

          {/* Features row */}
          <div className="features-row">
            <div className="feature-item">
              <span>⚡</span> Real-time sync
            </div>
            <div className="feature-item">
              <span>🌍</span> Multi-language
            </div>
            <div className="feature-item">
              <span>▶️</span> Run code
            </div>
            <div className="feature-item">
              <span>💾</span> Download file
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        Built with ⚡ React · Node.js · Socket.io · MongoDB
      </footer>
    </div>
  );
};

export default HomePage;
