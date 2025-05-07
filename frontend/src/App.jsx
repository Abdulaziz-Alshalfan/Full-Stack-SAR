import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import UploadPage from './UploadPage.jsx';
import WebcamPage from './WebcamPage.jsx';
import HomePage from './HomePage.jsx';
import AdminPage from './AdminPage.jsx'; // if not created yet, just comment out

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/webcam" element={<WebcamPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
