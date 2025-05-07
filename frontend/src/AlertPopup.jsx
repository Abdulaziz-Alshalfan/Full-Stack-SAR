import React, { useState, useEffect, useRef } from "react";
import "./style.css";
import { markAlertSeen, markAllAlertsSeen } from "./api";

const BASE_URL = "https://ai-sar-backend-fastapi.onrender.com";

const AlertPopup = ({ alerts, onSelect, onClose, unseenIds, setUnseenIds }) => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("time");
  const [sortOrder, setSortOrder] = useState("desc");
  const ref = useRef();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const handleAlertClick = async (alert) => {
    if (unseenIds.includes(alert._id)) {
      await markAlertSeen(alert._id);
      setUnseenIds((prev) => prev.filter((id) => id !== alert._id));
    }
    onSelect(alert);
    onClose();
  };

  const handleMarkAllAsSeen = async () => {
    await markAllAlertsSeen();
    setUnseenIds([]);
  };

  const filtered = alerts.filter((a) =>
    typeFilter === "all" ? true : a.type === typeFilter
  );

  const sorted = [...filtered].sort((a, b) => {
    const factor = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "time") return factor * (new Date(a.timestamp) - new Date(b.timestamp));
    if (sortBy === "confidence") return factor * (a.confidence - b.confidence);
    return 0;
  });

  return (
    <div className="popup-overlay">
      <div className="alert-popup" ref={ref}>
        <div className="popup-header">
          <span>All Alerts</span>
          <div className="popup-controls">
            <button className="mark-seen-btn yellow-btn" onClick={handleMarkAllAsSeen}>
              Mark all as seen
            </button>
            <button onClick={onClose} className="btn-close">Close</button>
          </div>
        </div>

        <div className="popup-filters">
          <select onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
            <option value="all">All</option>
            <option value="alert">Alert</option>
            <option value="critical">Critical</option>
            <option value="false_positive">False Positive</option>
          </select>
          <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
            <option value="time">Time</option>
            <option value="confidence">Confidence</option>
          </select>
          <button
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="sort-toggle"
          >
            {sortOrder === "asc" ? "⬆️" : "⬇️"}
          </button>
        </div>

        <div className="popup-list">
          {sorted.map((alert) => (
          <div
          key={alert._id}
          className={`popup-item ${alert.type}`}
          onClick={() => handleAlertClick(alert)}
        >
        
              <img
                src={`${BASE_URL}${alert.image}`}
                alt="thumb"
                className="popup-thumb"
              />
              <div className="popup-item-content">
                <p>
                  {new Date(alert.timestamp).toLocaleString()} —{" "}
                  <strong>{alert.type.toUpperCase()}</strong>
                </p>
                <p>
                  {alert.label} ({(alert.confidence * 100).toFixed(1)}%)
                </p>
              </div>
              {unseenIds.includes(alert._id) && (
                <div className="unseen-indicator">●</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlertPopup;
