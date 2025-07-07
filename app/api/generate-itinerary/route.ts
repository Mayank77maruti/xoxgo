import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';

export async function POST(req: NextRequest) {
  const { places } = await req.json();
  if (!places || !Array.isArray(places) || places.length === 0) {
    return NextResponse.json({ error: 'No places provided' }, { status: 400 });
  }
  // Use GROQ to generate a day-by-day itinerary for the selected places
  const placeNames = places.map((p: any) => p.name).join(', ');
  const prompt = `Create a 3-day itinerary for a trip including these places: ${placeNames}. Return a structured JSON with days and activities.`;
  const response = await getItinerary({ city: '', budget: '', interests: [placeNames, 'itinerary'] });
  // Try to extract the JSON itinerary
  let itinerary: any = null;
  try {
    const match = response.match(/({[\s\S]*})/);
    if (match) {
      itinerary = JSON.parse(match[1]);
    }
  } catch {}
  return NextResponse.json({ itinerary });
} 