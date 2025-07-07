import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';
import { driver } from '../../../lib/neo4j';
import { getPlaceInfo } from '../../../lib/serp';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function geocodeWithTavily(location: string, city: string) {
  const res = await fetch('https://api.tavily.com/v1/geocode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query: `${location}, ${city}` }),
  });
  const data = await res.json();
  if (data && data.lat && data.lon) {
    return { lat: data.lat, lon: data.lon };
  }
  return null;
}

async function geocodeWithNominatim(location: string, city: string) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', ' + city)}`);
  const data = await res.json();
  if (data && data[0]) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { city, budget, interests } = await req.json();
  if (!city || !budget || !interests) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  let itinerary = '';
  try {
    itinerary = await getItinerary({ city, budget, interests });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  console.log('AI response:', itinerary); // Log the raw AI response for debugging
  // Try to extract JSON from the AI response
  let parsed: any = null;
  try {
    // This regex will match the first {...} block in the response
    const match = itinerary.match(/```json([\s\S]*?)```/i) || itinerary.match(/({[\s\S]*})/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    }
  } catch (err) {
    console.error('Failed to parse AI JSON:', err);
  }
  // If parsing fails, return an error
  if (!parsed) {
    return NextResponse.json({ error: 'Could not parse itinerary details from AI response.' }, { status: 500 });
  }
  // Enrich each activity with SERP API data and Tavily geocoding
  if (parsed && parsed.itinerary) {
    for (const day of parsed.itinerary) {
      for (const act of day.activities) {
        // 1. Use Tavily for address/location info
        try {
          const tavilyRes = await fetch('https://api.tavily.com/v1/place-details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TAVILY_API_KEY}`,
            },
            body: JSON.stringify({ query: `${act.location}, ${city}` }),
          });
          const tavilyData = await tavilyRes.json();
          if (tavilyData.address) act.address = tavilyData.address;
          if (tavilyData.location) act.location_info = tavilyData.location;
        } catch (err) {
          console.error('Tavily address error:', err);
        }
        // 2. Use Nominatim for lat/lng
        try {
          const geo = await geocodeWithNominatim(act.location, city);
          if (geo) {
            act.lat = geo.lat;
            act.lon = geo.lon;
          }
        } catch (err) {
          console.error('Nominatim geocoding error:', err);
        }
        // 3. (Optional) Still use Tavily for reviews/images on demand from frontend
        // 4. (Optional) Attach SERP info as before
        try {
          const serp = await getPlaceInfo(act.location, city);
          if (serp) {
            act.rating = serp.rating;
            act.image = serp.image;
            act.link = serp.link;
          }
        } catch {}
      }
    }
  }
  // Log the query to Neo4j
  const session = driver.session();
  try {
    await session.run(
      `MERGE (c:City {name: $city})
       CREATE (q:Query {budget: $budget, interests: $interests, createdAt: datetime()})
       MERGE (q)-[:FOR_CITY]->(c)`,
      { city, budget, interests: interests.join(', ') }
    );
  } catch (e: any) {
    // Logging error, but don't block response
    console.error('Neo4j log error:', e.message);
  } finally {
    await session.close();
  }
  // Return enriched itinerary if possible, else fallback
  if (parsed) {
    return NextResponse.json({ itinerary: parsed });
  }
  return NextResponse.json({ itinerary });
} 