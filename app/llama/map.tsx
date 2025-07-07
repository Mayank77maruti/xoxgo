'use client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon for Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FitBounds({ locations }: { locations: { lat: number; lon: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 1) {
      const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [locations, map]);
  return null;
}

export default function ClientMap({ locations }: { locations: { lat: number; lon: number; name: string; image?: string }[] }) {
  if (!locations.length) return null;
  return (
    <MapContainer center={[locations[0].lat, locations[0].lon] as [number, number]} zoom={12} style={{ height: 350, width: '100%', borderRadius: 8 }} scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds locations={locations} />
      {locations.map((loc, idx) => (
        <Marker key={idx} position={[loc.lat, loc.lon] as [number, number]}>
          <Popup>
            <div>
              <div><strong>{loc.name}</strong></div>
              {loc.image && <img src={loc.image} alt={loc.name} style={{ maxWidth: 180, marginTop: 8, borderRadius: 4 }} />}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
} 