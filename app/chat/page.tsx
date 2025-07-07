"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

const HISTORY_KEY = "travel_chat_history_v1";

// Helper to call backend APIs
async function callApi(endpoint: string, body: any) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

const ClientMap = dynamic(() => import('../llama/map'), { ssr: false });

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [itinerary, setItinerary] = useState<any>(null);
  const [mode, setMode] = useState<'suggest'|'select'|'itinerary'|'qa'>('suggest');
  const [history, setHistory] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [modalPlace, setModalPlace] = useState<any | null>(null);
  const [modalDetails, setModalDetails] = useState<{ reviews: string[]; images: string[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    // On first load, show only a hello message
    if (messages.length === 0 && !loading) {
      setMessages([{ role: 'assistant', content: 'Hi! 👋 How can I assist you today?' }]);
    }
    // eslint-disable-next-line
  }, []);

  // Load history from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch {}
    }
  }, []);

  // Save current session to history when itinerary is generated
  useEffect(() => {
    if (mode === 'qa' && itinerary && itinerary.itinerary) {
      const session = {
        messages,
        itinerary,
        timestamp: Date.now(),
      };
      setHistory(prev => {
        const updated = [session, ...prev].slice(0, 10); // keep last 10 sessions
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
    }
    // eslint-disable-next-line
  }, [mode, itinerary]);

  // Load a session from history
  function loadSession(idx: number) {
    const session = history[idx];
    if (!session) return;
    setMessages(session.messages);
    setItinerary(session.itinerary);
    setMode('qa');
    setActiveSession(idx);
  }

  // Simple intent detection for demo
  function detectIntent(text: string) {
    if (mode === 'qa') return 'qa';
    if (/suggest|recommend|places/i.test(text)) return "suggest";
    if (/itinerary|plan|days|trip/i.test(text)) return "itinerary";
    if (/\?/i.test(text)) return "qa";
    return "suggest";
  }

  // Start a new chat session
  function startNewChat() {
    setMessages([{ role: 'assistant', content: 'Hi! 👋 How can I assist you today?' }]);
    setInput("");
    setLoading(false);
    setSelected(new Set());
    setItinerary(null);
    setMode('suggest');
    setActiveSession(null);
  }

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setLoading(true);
    let reply = "";
    try {
      const intent = detectIntent(input);
      if (mode === 'suggest' || intent === "suggest") {
        setPlaces([]);
        const data = await callApi("/api/suggest-places", { message: input });
        setPlaces(data.places || []);
        setMode('select');
        setMessages((msgs) => [...msgs, { role: 'assistant', content: 'Here are some places you can choose from:' }]);
        setInput("");
        setLoading(false);
        return;
      } else if (intent === "itinerary") {
        if (selected.size === 0) {
          reply = "Please select at least one place from the list first.";
        } else {
          const chosen = Array.from(selected).map(idx => places[idx]);
          const data = await callApi("/api/generate-itinerary", { places: chosen });
          setItinerary(data.itinerary);
          setMode('qa');
          reply = "Here is your itinerary:";
        }
      } else if (intent === "qa") {
        const chosen = Array.from(selected).map(idx => places[idx]);
        const data = await callApi("/api/qa", { question: input, itinerary: { places: chosen, itinerary } });
        reply = data.answer || "No answer found.";
      }
    } catch (e: any) {
      reply = e.message || "Error processing request.";
    } finally {
      setMessages((msgs) => [...msgs, { role: "assistant", content: reply }]);
      setInput("");
      setLoading(false);
    }
  }

  function toggleSelect(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function openPlaceDetails(place: any) {
    setModalPlace(place);
    setModalDetails(null);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/place-details?place=${encodeURIComponent(place.name)}&city=${encodeURIComponent(place.address || '')}`);
      const data = await res.json();
      setModalDetails({
        ...data,
        images: Array.isArray(data.images) ? data.images : [],
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
      });
    } catch {
      setModalDetails({ reviews: [], images: [] });
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <div style={{ display: 'flex', maxWidth: 1000, margin: "2rem auto" }}>
      {/* Sidebar for history */}
      <div style={{ width: 220, marginRight: 24, background: '#f7f7fa', borderRadius: 8, padding: 16, boxShadow: '0 2px 8px #eee', height: 'fit-content' }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Chat History</div>
        <button onClick={startNewChat} style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 6, border: '1px solid #0070f3', background: '#fff', color: '#0070f3', fontWeight: 600, cursor: 'pointer' }}>+ New Chat</button>
        {history.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>No previous sessions</div>}
        {history.map((s, idx) => (
          <div key={idx} style={{ marginBottom: 10, cursor: 'pointer', background: activeSession === idx ? '#e0e7ff' : '#fff', borderRadius: 6, padding: 8, border: '1px solid #ddd' }} onClick={() => loadSession(idx)}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Session {history.length - idx}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{new Date(s.timestamp).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.messages.find((m: any) => m.role === 'user')?.content || '...'}</div>
          </div>
        ))}
      </div>
      {/* Main chat and itinerary area */}
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 600, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
          <h2>Travel Assistant Chat</h2>
          <div style={{ minHeight: 300, background: "#fafbfc", padding: 12, borderRadius: 6, marginBottom: 12, overflowY: "auto", maxHeight: 400 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ margin: "8px 0", textAlign: msg.role === "user" ? "right" : "left" }}>
                <span style={{ fontWeight: msg.role === "user" ? 600 : 400 }}>{msg.role === "user" ? "You" : "Assistant"}:</span> {msg.content}
              </div>
            ))}
            {mode === 'select' && places.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Select places to include in your itinerary:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {places.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', border: selected.has(idx) ? '2px solid #0070f3' : '1px solid #ccc', borderRadius: 6, padding: 8, background: '#fff', cursor: 'pointer' }} onClick={() => openPlaceDetails(p)}>
                      <input type="checkbox" checked={selected.has(idx)} onChange={e => { e.stopPropagation(); toggleSelect(idx); }} style={{ marginRight: 8 }} />
                      {p.image && <img src={p.image} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, marginRight: 12 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{p.name} {p.rating && <span style={{ color: '#f5a623' }}>★ {p.rating}</span>}</div>
                        <div style={{ fontSize: 13, color: '#555' }}>{p.description}</div>
                        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Cost: {p.cost || 'N/A'} | {p.info}</div>
                        {p.address && <div style={{ fontSize: 12, color: '#888' }}>Address: {p.address}</div>}
                        {p.link && <div style={{ fontSize: 12, color: '#0070f3' }}><a href={p.link} target="_blank" rel="noopener noreferrer">View on Google Maps</a></div>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Map of all places with lat/lon, markers clickable */}
                <div style={{ marginTop: 20, marginBottom: 8 }}>
                  <ClientMap locations={places.filter(p => p.lat && p.lon).map(p => ({ lat: p.lat, lon: p.lon, name: p.name, image: p.image, onClick: () => openPlaceDetails(p) }))} />
                </div>
                <button style={{ marginTop: 16 }} disabled={selected.size === 0 || loading} onClick={() => { setInput('generate itinerary'); handleSend(); }}>Generate Itinerary</button>
              </div>
            )}
            {/* Modal for place details (reviews/images) */}
            {modalPlace && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalPlace(null)}>
                <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                  <h3>{modalPlace.name}</h3>
                  {modalPlace.image && <img src={modalPlace.image} alt={modalPlace.name} style={{ width: '100%', borderRadius: 6, marginBottom: 12 }} />}
                  {loadingDetails ? <div>Loading...</div> : (
                    <>
                      {modalDetails && modalDetails.images.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <strong>Images:</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {modalDetails.images.map((img, idx) => (
                              <img key={idx} src={img} alt={modalPlace.name} style={{ width: 100, borderRadius: 4 }} />
                            ))}
                          </div>
                        </div>
                      )}
                      {modalDetails && modalDetails.reviews.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <strong>Reviews:</strong>
                          <ul>
                            {modalDetails.reviews.map((rev: string, idx: number) => <li key={idx}>{rev}</li>)}
                          </ul>
                        </div>
                      )}
                      {modalDetails && modalDetails.images.length === 0 && modalDetails.reviews.length === 0 && (
                        <div>No details found for this place.</div>
                      )}
                    </>
                  )}
                  <button style={{ marginTop: 16 }} onClick={() => setModalPlace(null)}>Close</button>
                </div>
              </div>
            )}
            {loading && <div>Assistant is typing...</div>}
          </div>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={mode === 'select' ? "Type to search or ask for more places..." : "Ask about places, itineraries, or anything travel..."}
              style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>Send</button>
          </form>
          {/* Show itinerary as cards below chat area */}
          {mode === 'qa' && itinerary && itinerary.itinerary && (
            <div style={{ marginTop: 32 }}>
              <h3 style={{ marginBottom: 16 }}>Your Itinerary</h3>
              {itinerary.itinerary.map((day: any, i: number) => (
                <div key={i} style={{ marginBottom: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Day {day.day}</div>
                  {day.activities.map((act: any, j: number) => (
                    <div key={j} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
                      {act.image && <img src={act.image} alt={act.location} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 6 }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{act.location}</div>
                        <div style={{ fontSize: 13, color: '#888' }}>Best time: {act.best_time_to_visit}</div>
                        <div style={{ fontSize: 13, color: '#888' }}>Cost: {act.cost}</div>
                        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{act.highlights}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 