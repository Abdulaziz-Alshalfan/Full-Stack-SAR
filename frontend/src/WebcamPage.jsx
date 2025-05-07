// WebcamPage.jsx
import React, { useEffect, useRef, useState } from "react";
import AlertPopup from "./AlertPopup";
import {
  fetchAlerts,
  markAlertSeen,
  markAllAlertsSeen,
} from "./api";
import HeatMap from "./HeatMap";
import logo from "./logo.png";
import "./style.css";

const BASE_URL = "https://ai-sar-backend-fastapi.onrender.com";

function WebcamPage() {
  const videoRef = useRef(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [unseenIds, setUnseenIds] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showCriticalPopup, setShowCriticalPopup] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [zoomed, setZoomed] = useState(false);
  const [webcamOn, setWebcamOn] = useState(false);
  const intervalRef = useRef(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam", err);
      showNotification("Webcam access denied", "error");
    }
  };

  const stopWebcam = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (webcamOn) {
      startWebcam();
      intervalRef.current = setInterval(captureFrame, 1000);
    } else {
      stopWebcam();
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [webcamOn]);

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        showNotification("No image captured", "error");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const formData = new FormData();
          formData.append("file", blob, "frame.jpg");
          formData.append("lat", position.coords.latitude);
          formData.append("lon", position.coords.longitude);

          fetch(`${BASE_URL}/api/webcam`, {
            method: "POST",
            body: formData,
          })
            .then((res) => res.json())
            .then((data) => {
              if (!data.alert) return;
              const type = data.alert.type;
              if (type === "critical") {
                setShowCriticalPopup(true);
              } else if (type === "alert") {
                showNotification("Alert detected", "warning", true);
              } else if (type === "false_positive") {
                showNotification("False positive", "gray", true);
              }
              showNotification("Detection complete", "success");
              loadAlerts();
            })
            .catch((err) => {
              console.error("Upload error", err);
              showNotification("Failed to send frame", "error");
            });
        },
        (err) => {
          console.error("GPS error:", err.message);
          showNotification("GPS access failed", "error");
        }
      );
    }, "image/jpeg");
  };

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data.reverse());
      const unseen = data.filter((a) => !a.seen).map((a) => a._id);
      setUnseenIds(unseen);
    } catch (err) {
      console.error("Alert fetch failed", err);
      showNotification("Failed to refresh alerts", "error");
    }
  };

  const showNotification = (message, type = "success", sticky = false) => {
    const id = Date.now();
    const note = { id, message, type, sticky };
    setNotifications((prev) => [...prev, note]);
    if (!sticky) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3000);
    }
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
          <img src={logo} alt="Logo" style={{ height: "30px", marginLeft: "10px", cursor: "pointer" }} />
        </div>
        <h2>AI Detection Webcam</h2>
        <button className="view-alerts-btn" onClick={() => setShowPopup(true)}>
          View Alerts {unseenIds.length > 0 && <span className="badge">{unseenIds.length}</span>}
        </button>
        <div className="switch-container">
          <label className="switch">
            <input type="checkbox" checked={webcamOn} onChange={() => setWebcamOn(!webcamOn)} />
            <span className="slider"></span>
          </label>
          <span style={{ marginLeft: "10px", color: webcamOn ? "#16a34a" : "#dc2626" }}>
            Webcam {webcamOn ? "On" : "Off"}
          </span>
        </div>
      </div>

      <div className="upload-container">
        <video ref={videoRef} autoPlay muted className="w-full max-w-3xl rounded shadow-lg" style={{ maxHeight: "400px", margin: "auto" }} />
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
      )}

      {zoomed && (
        <div className="modal-overlay" onClick={() => setZoomed(false)}>
          <div className="modal-image-container" onClick={(e) => e.stopPropagation()}>
            <img src={`${BASE_URL}${selectedAlert.image}`} alt="Zoomed" className="modal-image" />
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

      <div className="notifications top-left">
        {notifications.map((n) => (
          <div key={n.id} className={`notification ${n.type}`}>
            <span>{n.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WebcamPage;
