import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "leaflet/dist/leaflet.css";

// Setup Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Function to get icon color based on fullness
const getDropoffIcon = (fullness) => {
  if (fullness >= 80) return redIcon;     // almost full
  if (fullness >= 50) return new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  });
  return greenIcon;                       // available
};

const Map = () => {
  const [dropoffs, setDropoffs] = useState([]);
  const [dumpsites, setDumpsites] = useState([]);

  // Fetch drop-off centers
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "dropoffs"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fullness: doc.data().fullness ?? Math.floor(Math.random() * 50 + 30) // fallback
      }));
      setDropoffs(data);
    });
    return () => unsubscribe();
  }, []);

  // Fetch dump sites
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "dump_sites"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDumpsites(data);
    });
    return () => unsubscribe();
  }, []);

  // Live fullness simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setDropoffs(prev =>
        prev.map(d => ({
          ...d,
          fullness: Math.min(100, Math.max(0, d.fullness + (Math.random() * 10 - 5)))
        }))
      );
    }, 5000); // every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-customBlack p-4 rounded-lg shadow-lg">
      <MapContainer
        center={[7.1500, 3.3500]}
        zoom={10}
        style={{ height: "400px", width: "100%", borderRadius: "8px" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="bottomright" />

        {/* Drop-off markers */}
        {dropoffs.map((dropoff, index) => (
          <Marker
            key={index}
            position={[dropoff.lat, dropoff.lng]}
            icon={getDropoffIcon(dropoff.fullness)}
          >
            <Popup>
              <div className="text-customBlack">
                <b>{dropoff.name}</b><br />
                Fullness: {dropoff.fullness.toFixed(0)}%<br />
                Status: {dropoff.status || "Available"}<br />
                Sell plastics for ₦30/kg!
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dump site markers */}
        {dumpsites.map((site, index) => (
          <Marker key={index} position={[site.lat, site.lng]} icon={redIcon}>
            <Popup>
              <div className="text-customBlack">
                <b>{site.name || "Unknown Site"}</b><br />
                Waste Type: {site.wasteType || "Unknown"}<br />
                Description: {site.description || "No description"}<br />
                Reported: {site.timestamp ? new Date(site.timestamp.seconds * 1000).toLocaleString() : "Unknown"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Dynamic Lists */}
      <div className="mt-4">
        <h3 className="text-xl font-semibold text-customRed">Drop-Off Status</h3>
        <ul className="mt-2 space-y-2 text-customWhite">
          {dropoffs.map((d, i) => (
            <li key={i}>
              {d.name}: {d.fullness.toFixed(0)}% full
            </li>
          ))}
        </ul>

        <h3 className="text-xl font-semibold text-customRed mt-4">Dump Sites</h3>
        <ul className="mt-2 space-y-2 text-customWhite">
          {dumpsites.map((d, i) => (
            <li key={i}>
              {d.name || "Unknown"} | Waste: {d.wasteType || "Unknown"} | Reported: {d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : "Unknown"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Map;
