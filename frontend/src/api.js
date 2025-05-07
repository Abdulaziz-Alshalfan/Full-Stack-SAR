const BASE_URL = 'https://ai-sar-backend-fastapi.onrender.com/api';

export const uploadAlert = async (file, lat, lon) => {
  const formData = new FormData();
  formData.append("file", file);
  if (lat && lon) {
    formData.append("lat", lat);
    formData.append("lon", lon);
  }

  const res = await fetch(`${BASE_URL}/alert`, {
    method: "POST",
    body: formData,
  });

  return res.json();
};
export const fetchAlerts = async () => {
  const res = await fetch(`${BASE_URL}/alerts`);
  return res.json();
};

export const markAlertSeen = async (alertId) => {
  const res = await fetch(`${BASE_URL}/alerts/${alertId}/seen`, {
    method: "PATCH",
  });
  return res.json();
};

export const markAllAlertsSeen = async () => {
  const res = await fetch(`${BASE_URL}/alerts/seen`, {
    method: "PATCH",
  });
  return await res.json();
};
// DELETE one alert by ID
export async function deleteAlert(id, imagePath) {
  const res = await fetch(`${BASE_URL}/alerts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_path: imagePath }),
  });
  return res.json();
}

export async function deleteAlertsByFilter(filter) {
  const res = await fetch(`${BASE_URL}/alerts/delete_by_filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filter),
  });
  return res.json();
}
