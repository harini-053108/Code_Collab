/**
 * App.js — Root component
 * Sets up React Router for navigation between pages
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";

function App() {
  return (
    <Router>
      {/* Toast notification container (for copy/join messages) */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e1e2e",
            color: "#cdd6f4",
            border: "1px solid #313244",
            borderRadius: "8px",
            fontFamily: "'Inter', sans-serif",
          },
          success: { iconTheme: { primary: "#a6e3a1", secondary: "#1e1e2e" } },
          error:   { iconTheme: { primary: "#f38ba8", secondary: "#1e1e2e" } },
        }}
      />

      <Routes>
        {/* Home page: Create or Join a room */}
        <Route path="/" element={<HomePage />} />

        {/* Editor page: /editor/:roomId */}
        <Route path="/editor/:roomId" element={<EditorPage />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
