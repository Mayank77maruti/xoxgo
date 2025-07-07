'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ClientMap = dynamic(() => import('./map'), { ssr: false });

function parseItineraryResponse(response: string) {
  // Try to extract the JSON block from the response
  const match = response.match(/```json([\s\S]*?)```/i) || response.match(/({[\s\S]*})/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // fallback
    }
  }
  return null;
}

export default function LlamaPage() {
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [interests, setInterests] = useState('');
  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLocations, setGeoLocations] = useState<{ lat: number; lon: number; name: string; image?: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setItinerary(null);
    try {
      const res = await fetch('/api/llama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          budget,
          interests: interests.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      if (!res.ok) throw new Error('Failed to get itinerary');
      const data = await res.json();
      console.log('API response:', data); // Debug log
      setItinerary(data.itinerary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!itinerary || !itinerary.itinerary) return setGeoLocations([]);
    // Collect all activities with lat/lon
    const locations: { lat: number; lon: number; name: string; image?: string }[] = [];
    for (const day of itinerary.itinerary) {
      for (const act of day.activities) {
        if (typeof act.lat === 'number' && typeof act.lon === 'number') {
          locations.push({ lat: act.lat, lon: act.lon, name: act.location, image: act.image });
        }
      }
    }
    setGeoLocations(locations);
  }, [itinerary]);

  let parsed = itinerary;

  // Collect all locations for the map
  const allLocations = itinerary && itinerary.itinerary
    ? itinerary.itinerary.flatMap((day: any) => day.activities.map((act: any) => act.location))
    : [];

  // Helper to build Google Maps Static API URL
  function getMapUrl(locations: string[], city: string) {
    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const markers = locations.map(loc => `markers=${encodeURIComponent(loc + ', ' + city)}`).join('&');
    return `${base}?size=600x300&${markers}&key=${apiKey}`;
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h1>LLaMA AI Travel Itinerary</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          City:
          <input value={city} onChange={e => setCity(e.target.value)} required />
        </label>
        <label>
          Budget:
          <input value={budget} onChange={e => setBudget(e.target.value)} required />
        </label>
        <label>
          Interests (comma separated):
          <input value={interests} onChange={e => setInterests(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Loading...' : 'Get Itinerary'}</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      {itinerary && itinerary.itinerary && itinerary.itinerary.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <h2>Your Itinerary</h2>
          {mounted && geoLocations.length > 0 && (
            <div style={{ marginBottom: 24, height: 350 }}>
              <ClientMap locations={geoLocations} />
            </div>
          )}
          {itinerary.itinerary.map((day: any, i: number) => (
            <div key={i} style={{ marginBottom: 24, padding: 16, background: '#f4f8fb', borderRadius: 8 }}>
              <h3 style={{ marginBottom: 12 }}>Day {day.day}</h3>
              <ol style={{ paddingLeft: 20 }}>
                {day.activities.map((act: any, j: number) => (
                  <li key={j} style={{ marginBottom: 16 }}>
                    <div><strong>Location:</strong> {act.location}</div>
                    <div><strong>Best Time to Visit:</strong> {act.best_time_to_visit}</div>
                    <div><strong>Highlights:</strong> {act.highlights}</div>
                    <div><strong>Cost:</strong> ₹{act.cost}</div>
                    {act.rating && (
                      <div><strong>User Rating:</strong> {act.rating} / 5</div>
                    )}
                    {act.address && (
                      <div><strong>Address:</strong> {act.address}</div>
                    )}
                    {act.link && (
                      <div><a href={act.link} target="_blank" rel="noopener noreferrer">View on Google Maps</a></div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {itinerary.total_cost && (
            <div style={{ marginTop: 16, fontWeight: 'bold' }}>
              Total Cost of the itinerary: ₹{itinerary.total_cost}
            </div>
          )}
        </div>
      ) : !error && (
        <div style={{ marginTop: 24, color: 'red' }}>
          No itinerary details available. Please try again with a different city or check your API setup.
        </div>
      )}
    </div>
  );
} 