// UploadPage.jsx (patched version)
import React, { useState, useEffect } from "react";
import {
  uploadAlert,
  fetchAlerts,
  markAlertSeen,
  markAllAlertsSeen,
} from "./api";
import AlertPopup from "./AlertPopup";
import "./style.css";
import HeatMap from "./HeatMap";
import logo from "./logo.png";

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [unseenIds, setUnseenIds] = useState([]);
  const [showCriticalPopup, setShowCriticalPopup] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const BASE_URL = 'https://ai-sar-backend-fastapi.onrender.com';
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const data = await fetchAlerts();
    setAlerts(data.reverse());
    const unseen = data.filter((a) => !a.seen).map((a) => a._id);
    setUnseenIds(unseen);
  };

  const showNotification = (message, type = "success", sticky = false) => {
    if (!message) return;
    const id = Date.now();
    const newNote = { id, message, type, sticky };
    setNotifications((prev) => [...prev, newNote]);
    if (!sticky) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3000);
    }
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setResult(null);
    if (selected) {
      showNotification(`${selected.name} selected successfully`, "success");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selected = e.dataTransfer.files[0];
    setFile(selected);
    setResult(null);
    if (selected) {
      showNotification(`${selected.name} selected successfully`, "success");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("lat", latitude);
        formData.append("lon", longitude);
        
        try {
          const res = await fetch(`${BASE_URL}/api/alert`, {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!data.alert) {
            showNotification("No alert generated", "info");
            return;
          }

          const type = data.alert.type;
          if (type === "critical") {
            setShowCriticalPopup(true);
          } else if (type === "alert") {
            showNotification("Alert generated", "warning", true);
          } else if (type === "false_positive") {
            showNotification("False positive", "gray", true);
          }
          showNotification("Upload successful", "success");
          loadAlerts();
        } catch (err) {
          showNotification("Upload failed", "error");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error.message || error);
        showNotification(`GPS Error: ${error.message || "Unknown error"}`, "error");
        setLoading(false);
      }
      
    );
  };

  const handleAlertSelect = async (alert) => {
    if (unseenIds.includes(alert._id)) {
      await markAlertSeen(alert._id);
      setUnseenIds((prev) => prev.filter((id) => id !== alert._id));
    }
    setSelectedAlert(alert);
    setShowPopup(false);
  };

  return (
    <div className="upload-page">
      <div className="upload-header">
        <div className="header-logo" onClick={() => window.location.href = "/"}>
        <img
          src={logo}
          alt="Logo"
          onClick={() => (window.location.href = "/")}
          style={{ height: "30px", marginLeft: "10px", cursor: "pointer" }}
        />
          </div>
          <h2>AI Detection Upload</h2>
          <button className="view-alerts-btn" onClick={() => setShowPopup(true)}>
    View Alerts
    {unseenIds.length > 0 && <span className="badge">{unseenIds.length}</span>}
  </button>
</div>

      <div
        className="upload-container"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <label className="upload-label">
          Click or drop files to upload
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
        </label>
        {file && (
          <div className="preview-box">
            <p className="filename">{file.name}</p>
            <img
              src={URL.createObjectURL(file)}
              alt="Preview"
              className="file-thumbnail"
            />
          </div>
        )}
      </div>

      <div className="upload-button-container" style={{ textAlign: "center" }}>
        <button onClick={handleUpload} className="upload-button" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {selectedAlert && (
        <div className="alert-detail">
          <h3 className="text-xl font-semibold mb-4 text-center">Alert Detail</h3>
          <div className="alert-image-row">
          <div className="image-card yellow-tab">
            <p>Detected Image</p>
            <img
            src={`${BASE_URL}${selectedAlert.image}`}
            alt="Detected"
              className="detected-thumbnail"
              onClick={() => setZoomed(true)}
                style={{ cursor: "zoom-in" }}
              />
  </div>
  <div className="image-card red-tab">
    <p>Live Heatmap</p>
    <div className="heatmap-box">
      <HeatMap />
    </div>
  </div>
</div>

          <div className="alert-info">
            <p><strong>Type:</strong> {selectedAlert.type}</p>
            <p><strong>Label:</strong> {selectedAlert.label}</p>
            <p><strong>Confidence:</strong> {(selectedAlert.confidence * 100).toFixed(1)}%</p>
            <p><strong>Time:</strong>{" "}{new Date(selectedAlert.timestamp?.replace(/Z$/, "")).toLocaleString()}</p>
            <p><strong>GPS:</strong> <a href={selectedAlert.gps_url} target="_blank" rel="noopener noreferrer">{selectedAlert.gps}</a></p>
          </div>
          <button className="close-btn" onClick={() => setSelectedAlert(null)}>Close</button>
        </div>
      )}

{zoomed && (
  <div className="modal-overlay" onClick={() => setZoomed(false)}>
    <div className="modal-image-container" onClick={(e) => e.stopPropagation()}>
      <img
        src={`${BASE_URL}${selectedAlert.image}`}
        alt="Zoomed Detected"
        className="modal-image"
      />
      <button className="modal-close" onClick={() => setZoomed(false)}>✕</button>
    </div>
  </div>
)}

      {showPopup && (
        <AlertPopup
          alerts={alerts}
          onSelect={handleAlertSelect}
          onClose={() => setShowPopup(false)}
          unseenIds={unseenIds}
          setUnseenIds={setUnseenIds}
        />
      )}

      {showCriticalPopup && (
        <div className="popup-overlay">
          <div className="critical-popup">
            <h3>⚠️ Critical Alert Detected</h3>
            <p>A critical alert has been generated. View now?</p>
            <div className="popup-actions">
              <button onClick={() => { setShowPopup(true); setShowCriticalPopup(false); }}>View</button>
              <button onClick={() => setShowCriticalPopup(false)}>Continue</button>
            </div>
          </div>
        </div>
      )}

{/* Notifications */}
<div className="notifications">
{notifications.map((n) => (
  <div key={n.id} className={`notification ${n.type}`}>
    <span>{n.message}</span>
  </div>
))}
</div>

    </div>
  );
};

export default UploadPage;
