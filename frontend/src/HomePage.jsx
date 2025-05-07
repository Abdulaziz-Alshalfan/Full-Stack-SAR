import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "./logo.png";
import "./style.css";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page dark-theme" style={{ backgroundColor: "#0f172a" }}>
      <header className="top-bar" onClick={() => navigate("/")}>
        <img
          src={logo}
          alt="Logo"
          style={{ height: "30px", marginRight: "10px", cursor: "pointer" }}
        />
      </header>

      <div className="home-content">
        <img
          src={logo}
          alt="Logo"
          style={{ height: "60px", marginBottom: "20px" }}
        />
        <h1 className="main-title" style={{ color: "white" }}>SAR AI Model</h1>
        <div className="button-group">
          <button className="home-btn large" onClick={() => navigate("/upload")}>Upload Page</button>
          <button className="home-btn large" onClick={() => navigate("/webcam")}>Webcam Page</button>
        </div>
      </div>

      <button className="admin-btn" onClick={() => navigate("/admin")}>Admin</button>
    </div>
  );
};

export default HomePage;