// HeatMap.jsx
import React, { useEffect, useState } from "react";
import { GoogleMap, HeatmapLayerF } from "@react-google-maps/api";
import { fetchAlerts } from "./api";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const center = {
  lat: 24.7136,
  lng: 46.6753,
};

function HeatMap() {
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const alerts = await fetchAlerts();
      const points = alerts
        .filter(a => a.gps && a.type !== "none")
        .map(a => {
          const [lat, lon] = a.gps.split(",").map(Number);
          return {
            location: new window.google.maps.LatLng(lat, lon),
            weight: a.confidence,
          };
        });
      setHeatmapData(points);
    };
    loadData();
  }, []);

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={7}>
      {heatmapData.length > 0 && (
        <HeatmapLayerF data={heatmapData} options={{ radius: 30, opacity: 0.6 }} />
      )}
    </GoogleMap>
  );
}

export default HeatMap;
