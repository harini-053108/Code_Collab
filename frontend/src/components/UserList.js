/**
 * UserList.js
 * Displays the list of users currently in the room.
 * Shows an avatar (first letter of name) + username.
 * Highlights the current user with a "(You)" label.
 */

import React from "react";
import "./UserList.css";

// Generate a consistent color for each username
const getAvatarColor = (name) => {
  const colors = [
    "#89b4fa", // blue
    "#a6e3a1", // green
    "#f38ba8", // red
    "#fab387", // peach
    "#cba6f7", // mauve
    "#94e2d5", // teal
    "#f9e2af", // yellow
    "#89dceb", // sky
  ];
  // Simple hash based on char codes
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }
  return colors[hash % colors.length];
};

const UserList = ({ users = [], currentUser }) => {
  if (users.length === 0) {
    return (
      <div className="user-list-empty">
        <span>No users yet...</span>
      </div>
    );
  }

  return (
    <ul className="user-list">
      {users.map((user, index) => {
        const isCurrentUser = user === currentUser;
        const avatarColor = getAvatarColor(user);

        return (
          <li key={index} className={`user-item ${isCurrentUser ? "current-user" : ""}`}>
            {/* Avatar circle with first letter */}
            <div
              className="user-avatar"
              style={{ background: `${avatarColor}22`, border: `1.5px solid ${avatarColor}` }}
            >
              <span style={{ color: avatarColor }}>
                {user.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Username */}
            <span className="user-name">{user}</span>

            {/* "(You)" badge for current user */}
            {isCurrentUser && <span className="you-badge">You</span>}
          </li>
        );
      })}
    </ul>
  );
};

export default UserList;
