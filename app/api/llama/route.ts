import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';
import { driver } from '../../../lib/neo4j';
import { getPlaceInfo } from '../../../lib/serp';

// Helper to geocode a location using Nominatim
async function geocodeLocation(location: string, city: string) {
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
  // Enrich each activity with SERP API data and geocoding
  if (parsed && parsed.itinerary) {
    for (const day of parsed.itinerary) {
      for (const act of day.activities) {
        try {
          const serp = await getPlaceInfo(act.location, city);
          if (serp) {
            act.rating = serp.rating;
            act.image = serp.image;
            act.address = serp.address;
            act.link = serp.link;
          }
        } catch {}
        // Geocode location
        try {
          const geo = await geocodeLocation(act.location, city);
          if (geo) {
            act.lat = geo.lat;
            act.lon = geo.lon;
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