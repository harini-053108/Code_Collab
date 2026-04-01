/**
 * OutputPanel.js
 * Displays the result of code execution.
 * Shows: status, execution time, memory used, and stdout/stderr output.
 */

import React from "react";
import "./OutputPanel.css";

const OutputPanel = ({ output, isRunning, onClose }) => {
  return (
    <div className="output-panel">
      {/* Panel header */}
      <div className="output-header">
        <div className="output-title">
          <span className="output-icon">⚙️</span>
          <span>Output</span>
          {output && (
            <span
              className={`output-status ${
                output.status === "Accepted" ? "status-ok" : "status-err"
              }`}
            >
              {output.status}
            </span>
          )}
          {output?.time && (
            <span className="output-meta">⏱ {output.time}s</span>
          )}
          {output?.memory && (
            <span className="output-meta">💾 {output.memory} KB</span>
          )}
        </div>
        <button className="icon-btn close-btn" onClick={onClose} title="Close output panel">
          ✕
        </button>
      </div>

      {/* Panel body */}
      <div className="output-body">
        {isRunning ? (
          <div className="output-loading">
            <span className="output-spinner" />
            <span>Running code...</span>
          </div>
        ) : output ? (
          <pre className="output-text">{output.text}</pre>
        ) : (
          <div className="output-placeholder">
            Click <strong>▶ Run Code</strong> to see output here.
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
