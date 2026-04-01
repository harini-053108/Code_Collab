/**
 * EditorPage.js
 * The main collaborative code editor page.
 * Features:
 *  - Monaco Editor (VS Code-like editor in the browser)
 *  - Real-time code sync via Socket.io
 *  - Language selector
 *  - Run code via Judge0 API
 *  - Download code as a file
 *  - Connected users sidebar
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import toast from "react-hot-toast";
import socket from "../socket";
import UserList from "../components/UserList";
import OutputPanel from "../components/OutputPanel";
import "./EditorPage.css";

// Supported languages with their file extensions and Monaco language IDs
const LANGUAGES = [
  { id: "javascript", label: "JavaScript", ext: "js",  monacoId: "javascript" },
  { id: "typescript", label: "TypeScript", ext: "ts",  monacoId: "typescript" },
  { id: "python",     label: "Python",     ext: "py",  monacoId: "python"     },
  { id: "java",       label: "Java",       ext: "java",monacoId: "java"       },
  { id: "cpp",        label: "C++",        ext: "cpp", monacoId: "cpp"        },
  { id: "c",          label: "C",          ext: "c",   monacoId: "c"          },
];

// Default starter code per language
const DEFAULT_CODE = {
  javascript: `// JavaScript - Hello World\nconsole.log("Hello, World!");\n\n// Try editing this and see it sync in real-time!\nconst add = (a, b) => a + b;\nconsole.log("2 + 3 =", add(2, 3));\n`,
  typescript: `// TypeScript - Hello World\nconst greet = (name: string): string => {\n  return \`Hello, \${name}!\`;\n};\n\nconsole.log(greet("World"));\n`,
  python:     `# Python - Hello World\nprint("Hello, World!")\n\n# Try editing this!\ndef add(a, b):\n    return a + b\n\nprint(f"2 + 3 = {add(2, 3)}")\n`,
  java:       `// Java - Hello World\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
  cpp:        `// C++ - Hello World\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
  c:          `// C - Hello World\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
};

const EditorPage = () => {
  const { roomId }  = useParams();               // Get roomId from URL
  const location    = useLocation();             // Get state passed from HomePage
  const navigate    = useNavigate();

  // ── State ──────────────────────────────────
  const [code, setCode]           = useState(DEFAULT_CODE.javascript);
  const [language, setLanguage]   = useState("javascript");
  const [users, setUsers]         = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput]       = useState(null);
  const [outputVisible, setOutputVisible] = useState(false);

  // Ref to prevent re-broadcasting code we received from socket
  const isRemoteChange = useRef(false);

  // Username from navigation state, or prompt for one
  const username = location.state?.username || `User_${Math.random().toString(36).slice(2, 6)}`;

  // ── Socket.io Setup ────────────────────────
  useEffect(() => {
    // Connect the socket
    socket.connect();

    // Join the room
    socket.emit("join-room", { roomId, username });

    // ── Event Listeners ──────────────────────

    // Received initial room data on join
    socket.on("room-joined", ({ code: roomCode, language: roomLang, users: roomUsers }) => {
      setCode(roomCode);
      setLanguage(roomLang);
      setUsers(roomUsers);
      setIsConnected(true);
      toast.success(`Joined room ${roomId}`);
    });

    // Another user sent a code update
    socket.on("code-update", ({ code: newCode }) => {
      isRemoteChange.current = true; // flag so we don't re-emit
      setCode(newCode);
    });

    // Another user changed the language
    socket.on("language-update", ({ language: newLang }) => {
      setLanguage(newLang);
      toast(`Language changed to ${newLang}`, { icon: "🔄" });
    });

    // A new user joined the room
    socket.on("user-joined", ({ users: updatedUsers, username: newUser }) => {
      setUsers(updatedUsers);
      toast(`${newUser} joined the room`, { icon: "👋" });
    });

    // A user left the room
    socket.on("user-left", ({ users: updatedUsers, username: leftUser }) => {
      setUsers(updatedUsers);
      toast(`${leftUser} left the room`, { icon: "👋" });
    });

    // Error from server
    socket.on("error", ({ message }) => {
      toast.error(message);
    });

    // ── Cleanup on unmount ───────────────────
    return () => {
      socket.emit("leave-room", { roomId });
      socket.off("room-joined");
      socket.off("code-update");
      socket.off("language-update");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("error");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Handlers ──────────────────────────────

  /**
   * Called by Monaco Editor on every keystroke.
   * Emits code change to server (which broadcasts to others).
   */
  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);

    // If the change came from a remote socket event, don't re-broadcast
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    socket.emit("code-change", { roomId, code: newCode });
  }, [roomId]);

  /**
   * Called when user changes the language dropdown.
   */
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang] || "");
    socket.emit("language-change", { roomId, language: newLang });
    socket.emit("code-change", { roomId, code: DEFAULT_CODE[newLang] || "" });
  };

  /**
   * Run the current code using the Judge0 API via our backend.
   */
  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);
    setOutputVisible(true);

    try {
      const response = await axios.post("https://code-collab-z7ux.onrender.com/api/execute", { code, language });
      setOutput({
        text: response.data.output,
        status: response.data.status,
        time: response.data.time,
        memory: response.data.memory,
      });
    } catch (err) {
      setOutput({
        text: "❌ Error connecting to execution service.\n" + (err.message || ""),
        status: "Error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Download the current code as a file.
   */
  const handleDownload = () => {
    const langInfo = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
    const filename = `code_${roomId}.${langInfo.ext}`;

    // Create a temporary <a> tag to trigger download
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded as ${filename}`);
  };

  /**
   * Copy Room ID to clipboard for sharing.
   */
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied to clipboard!");
  };

  /**
   * Leave the room and go back to home.
   */
  const handleLeaveRoom = () => {
    socket.emit("leave-room", { roomId });
    navigate("/");
  };

  // ── Render ────────────────────────────────
  return (
    <div className="editor-layout">
      {/* ── Sidebar ── */}
      <aside className="editor-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">⚡ CodeSync</span>
        </div>

        {/* Room Info */}
        <div className="sidebar-section">
          <span className="sidebar-label">Room ID</span>
          <div className="room-id-display">
            <span className="room-id-text">{roomId}</span>
            <button className="icon-btn" onClick={handleCopyRoomId} title="Copy Room ID">
              📋
            </button>
          </div>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? "connected" : "connecting"}`} />
            <span>{isConnected ? "Connected" : "Connecting..."}</span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="sidebar-section">
          <span className="sidebar-label">Language</span>
          <select
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Users list */}
        <div className="sidebar-section flex-grow">
          <span className="sidebar-label">👥 Participants ({users.length})</span>
          <UserList users={users} currentUser={username} />
        </div>

        {/* Leave button */}
        <button className="btn btn-danger leave-btn" onClick={handleLeaveRoom}>
          🚪 Leave Room
        </button>
      </aside>

      {/* ── Main Editor Area ── */}
      <main className="editor-main">
        {/* Top toolbar */}
        <div className="editor-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-filename">
              code_{roomId}.{LANGUAGES.find((l) => l.id === language)?.ext || "js"}
            </span>
            <span className="badge badge-blue">{language}</span>
          </div>
          <div className="toolbar-right">
            {/* Run code */}
            <button
              className="btn btn-success"
              onClick={handleRunCode}
              disabled={isRunning}
            >
              {isRunning ? (
                <><span className="spinner-dark" /> Running...</>
              ) : (
                "▶ Run Code"
              )}
            </button>

            {/* Download */}
            <button className="btn btn-secondary" onClick={handleDownload}>
              ⬇ Download
            </button>

            {/* Toggle output panel */}
            <button
              className="btn btn-outline"
              onClick={() => setOutputVisible((v) => !v)}
            >
              {outputVisible ? "Hide Output" : "Show Output"}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className={`monaco-wrapper ${outputVisible ? "with-output" : ""}`}>
          <Editor
            height="100%"
            language={LANGUAGES.find((l) => l.id === language)?.monacoId || "javascript"}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "phase",
              cursorSmoothCaretAnimation: "on",
              wordWrap: "on",
              tabSize: 2,
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              renderLineHighlight: "line",
              automaticLayout: true, // auto resize on container change
            }}
          />
        </div>

        {/* Output Panel */}
        {outputVisible && (
          <OutputPanel
            output={output}
            isRunning={isRunning}
            onClose={() => setOutputVisible(false)}
          />
        )}
      </main>
    </div>
  );
};

export default EditorPage;
