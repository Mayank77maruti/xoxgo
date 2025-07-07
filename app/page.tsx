'use client';
import { useState } from 'react';

export default function Home() {
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [interests, setInterests] = useState('');
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setItinerary(null);
    try {
      const res = await fetch('/api/itinerary', {
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
      setItinerary(data.itinerary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h1>Travel Assistant</h1>
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
      {itinerary && (
        <div style={{ marginTop: 24 }}>
          <h2>Your Itinerary</h2>
          <pre style={{ background: '#f8f8f8', padding: 12, borderRadius: 4 }}>{itinerary}</pre>
        </div>
      )}
    </div>
  );
}
