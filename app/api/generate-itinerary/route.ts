import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';
import { jsonrepair } from 'jsonrepair';

export async function POST(req: NextRequest) {
  const { places } = await req.json();
  if (!places || !Array.isArray(places) || places.length === 0) {
    return NextResponse.json({ error: 'No places provided' }, { status: 400 });
  }
  // Use GROQ to generate a day-by-day itinerary for the selected places
  const placeNames = places.map((p: any) => p.name).join(', ');
  const prompt = `Create a 3-day itinerary for a trip including these places: ${placeNames}. Return a structured JSON with days and activities.`;
  const response = await getItinerary({ city: '', budget: '', interests: [placeNames, 'itinerary'] });

  // Try to extract and repair the JSON itinerary
  let itinerary: any = null;
  try {
    // Try direct parse
    try {
      itinerary = JSON.parse(response);
    } catch (e1) {
      // Try to extract JSON object with regex
      const match = response.match(/({[\s\S]*})/);
      if (match) {
        try {
          itinerary = JSON.parse(match[1]);
        } catch (e2) {
          // Try to repair the extracted JSON
          try {
            const repaired = jsonrepair(match[1]);
            itinerary = JSON.parse(repaired);
          } catch (e3) {
            // As a last resort, try to repair the whole response
            try {
              const repairedFull = jsonrepair(response);
              itinerary = JSON.parse(repairedFull);
            } catch (e4) {
              console.error('Failed to parse/repair itinerary:', e4, response);
              return NextResponse.json({ error: 'Failed to parse or repair itinerary from AI response', raw: response }, { status: 500 });
            }
          }
        }
      } else {
        // If no object found, try to repair the whole response
        try {
          const repairedFull = jsonrepair(response);
          itinerary = JSON.parse(repairedFull);
        } catch (e5) {
          console.error('Failed to parse/repair itinerary:', e5, response);
          return NextResponse.json({ error: 'Failed to parse or repair itinerary from AI response', raw: response }, { status: 500 });
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse/repair itinerary:', e, response);
    return NextResponse.json({ error: 'Failed to parse or repair itinerary from AI response', raw: response }, { status: 500 });
  }

  if (!itinerary) {
    return NextResponse.json({ error: 'No itinerary found in AI response', raw: response }, { status: 500 });
  }

  return NextResponse.json({ itinerary });
} 