// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = "AIzaSyCm5b6kIW-zc7zNW-V7IEv63Ing310cjOo"; // Replace with your real key

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={["visualization"]}>
      <App />
    </LoadScript>
  </React.StrictMode>
);
