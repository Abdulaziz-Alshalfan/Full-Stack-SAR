// AdminPage.jsx
import React, { useEffect, useState } from "react";
import {
  fetchAlerts,
  deleteAlert,
  deleteAlertsByFilter,
  markAllAlertsSeen,
  markAlertSeen
} from "./api";
import HeatMap from "./HeatMap";
import logo from "./logo.png";
import "./style.css";

const BASE_URL = "https://ai-sar-backend-fastapi.onrender.com";

const AdminPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [sortBy, setSortBy] = useState("time");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterType, setFilterType] = useState("All");
  const [filter, setFilter] = useState({
    type: "",
    minConfidence: 0,
    maxConfidence: 100,
    from: "",
    to: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 10;

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const data = await fetchAlerts();
    const filtered = data.filter(alert => filterType === "All" || alert.type === filterType.toLowerCase());
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "confidence") {
        return sortOrder === "asc" ? a.confidence - b.confidence : b.confidence - a.confidence;
      }
      return sortOrder === "asc"
        ? new Date(a.timestamp) - new Date(b.timestamp)
        : new Date(b.timestamp) - new Date(a.timestamp);
    });
    setAlerts(sorted);
    const unseen = sorted.filter(alert => !alert.seen).length;
    setUnseenCount(unseen);
  };

  const handleDelete = async (id, imagePath) => {
    if (window.confirm("Are you sure you want to delete this alert? This action cannot be undone.")) {
      await deleteAlert(id, imagePath);
      loadAlerts();
    }
  };

  const handleDeleteByFilter = async () => {
    if (window.confirm("Are you sure you want to delete alerts by filter? This action cannot be undone.")) {
      await deleteAlertsByFilter(filter);
      setShowFilterPopup(false);
      loadAlerts();
    }
  };

  const handleMarkAllSeen = async () => {
    await markAllAlertsSeen();
    loadAlerts();
  };

  const handleAlertSelect = async (alert) => {
    if (!alert.seen) {
      await markAlertSeen(alert._id);
    }
    setSelectedAlert(alert);
  };

  const indexOfLast = currentPage * alertsPerPage;
  const indexOfFirst = indexOfLast - alertsPerPage;
  const currentAlerts = alerts.slice(indexOfFirst, indexOfLast);
  const pageNumbers = Array.from({ length: Math.ceil(alerts.length / alertsPerPage) }, (_, i) => i + 1);

  return (
    <div className="upload-page">
      <div className="upload-header">
        <div className="header-logo" onClick={() => window.location.href = "/"}>
          <img src={logo} alt="Logo" className="logo" />
        </div>
        <h2>Admin Page</h2>
        <div className="sort-filter-controls">
          <select onChange={e => setFilterType(e.target.value)} value={filterType}>
            <option>All</option>
            <option>Critical</option>
            <option>Alert</option>
            <option>False_Positive</option>
          </select>
          <select onChange={e => setSortBy(e.target.value)} value={sortBy}>
            <option value="time">Time</option>
            <option value="confidence">Confidence</option>
          </select>
          <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? "⬆️" : "⬇️"}
          </button>
        </div>
        <button className="view-alerts-btn yellow" onClick={handleMarkAllSeen}>
          Mark All as Seen {unseenCount > 0 && <span className="badge">{unseenCount}</span>}
        </button>
        <button className="view-alerts-btn red" onClick={() => setShowFilterPopup(true)}>Delete by Filter</button>
      </div>

      <div className="upload-container" style={{ maxWidth: "95%" }}>
        <div className="alerts-list">
          {currentAlerts.map(alert => (
            <div key={alert._id} className="alert-item">
              <span onClick={() => handleAlertSelect(alert)}>
                {new Date(alert.timestamp?.replace(/Z$/, "")).toLocaleString()} - {alert.label} - {(alert.confidence * 100).toFixed(1)}% - {alert.type}
              </span>
              <button className="delete-btn" onClick={() => handleDelete(alert._id, alert.image)}>🗑</button>
            </div>
          ))}
          <div className="pagination-controls">
            {pageNumbers.map(number => (
              <button
                key={number}
                className={`page-btn ${currentPage === number ? 'active' : ''}`}
                onClick={() => setCurrentPage(number)}>
                {number}
              </button>
            ))}
          </div>
        </div>

        <div className="heatmap-column">
          {selectedAlert ? (
            <div className="alert-detail alert-detail-centered">
              <h3 className="text-xl font-semibold mb-4 text-center">Alert Detail</h3>
              <div className="alert-image-row">
                <div className="image-card yellow-tab">
                  <p>Detected Image</p>
                  <img
                    src={`${BASE_URL}${selectedAlert.image}`}
                    alt="Detected"
                    className="detected-thumbnail"
                  />
                </div>
                <div className="image-card red-tab">
                  <p>Live Heatmap</p>
                  <div className="heatmap-box"><HeatMap /></div>
                </div>
              </div>
              <div className="alert-info">
                <p><strong>Type:</strong> {selectedAlert.type}</p>
                <p><strong>Label:</strong> {selectedAlert.label}</p>
                <p><strong>Confidence:</strong> {(selectedAlert.confidence * 100).toFixed(1)}%</p>
                <p><strong>Time:</strong> {new Date(selectedAlert.timestamp?.replace(/Z$/, "")).toLocaleString()}</p>
                <p><strong>GPS:</strong> <a href={selectedAlert.gps_url} target="_blank" rel="noopener noreferrer">{selectedAlert.gps}</a></p>
              </div>
              <button className="close-btn" onClick={() => setSelectedAlert(null)}>Close</button>
            </div>
          ) : <HeatMap />}
        </div>
      </div>

      {showFilterPopup && (
        <div className="filter-popup-overlay">
          <div className="filter-popup">
            <h3>Delete Alerts by Filter</h3>
            <label>Type:</label>
            <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
              <option value="">Any Type</option>
              <option value="critical">Critical</option>
              <option value="alert">Alert</option>
              <option value="false_positive">False Positive</option>
            </select>

            <label>Confidence From (%):</label>
            <input
              type="number"
              placeholder="Min Confidence"
              min="0" max="100"
              value={filter.minConfidence}
              onChange={e => setFilter({ ...filter, minConfidence: parseFloat(e.target.value) || 0 })}
            />

            <label>Confidence To (%):</label>
            <input
              type="number"
              placeholder="Max Confidence"
              min="0" max="100"
              value={filter.maxConfidence}
              onChange={e => setFilter({ ...filter, maxConfidence: parseFloat(e.target.value) || 0 })}
            />

            <label>From Time:</label>
            <input
              type="datetime-local"
              value={filter.from}
              onChange={e => setFilter({ ...filter, from: e.target.value })}
            />

            <label>To Time:</label>
            <input
              type="datetime-local"
              value={filter.to}
              onChange={e => setFilter({ ...filter, to: e.target.value })}
            />

            <div className="filter-popup-actions">
              <button className="btn red" onClick={handleDeleteByFilter}>Delete</button>
              <button className="btn gray" onClick={() => setShowFilterPopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
