import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';
import { getPlaceInfo } from '../../../lib/serp';
import { jsonrepair } from 'jsonrepair';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function geocode(place: string, city: string) {
  // Use Tavily geocoding API
  const res = await fetch('https://api.tavily.com/v1/geocode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query: `${place}, ${city}` }),
  });
  const data = await res.json();
  if (data && data.lat && data.lon) return { lat: data.lat, lon: data.lon };
  return null;
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

  // Try to extract city from message (simple regex)
  const cityMatch = message.match(/in ([A-Za-z ]+)/i);
  const city = cityMatch ? cityMatch[1].trim() : '';

  // Use GROQ to suggest places with detailed info
  const prompt = `Suggest 8 must-visit places in a city based on this user input: "${message}". For each, provide:
- name (string)
- description (string)
- rating (number, 1-5)
- image (string, URL to a photo if possible)
- cost (string, e.g. $, $$, $$$)
- info (string, 1-2 sentences with highlights or tips)
- lat (number, if available)
- lon (number, if available)
Respond ONLY with a valid JSON array, no extra text, no markdown, no code fences, no explanation. The array must be valid JSON parsable by JSON.parse.`;
  const response = await getItinerary({ rawPrompt: prompt });

  // Debug: log the raw response
  console.log('GROQ response:', response);

  // Try to extract a JSON array of places, using jsonrepair if needed
  let places: any[] = [];
  try {
    // First, try to parse the response directly (in case it's a valid array)
    try {
      places = JSON.parse(response);
    } catch (e1) {
      // If that fails, try to extract the array using regex
      const match = response.match(/\[([\s\S]*?)\]/);
      if (match) {
        try {
          places = JSON.parse('[' + match[1] + ']');
        } catch (e2) {
          // Try to repair the extracted array
          try {
            const repaired = jsonrepair('[' + match[1] + ']');
            places = JSON.parse(repaired);
          } catch (e3) {
            // As a last resort, try to repair the entire response
            try {
              const repairedFull = jsonrepair(response);
              places = JSON.parse(repairedFull);
            } catch (e4) {
              console.error('Failed to parse/repair places:', e4, response);
              return NextResponse.json({ error: 'Failed to parse or repair places from AI response', raw: response }, { status: 500 });
            }
          }
        }
      } else {
        // If no array found, try to repair the whole response
        try {
          const repairedFull = jsonrepair(response);
          places = JSON.parse(repairedFull);
        } catch (e5) {
          console.error('Failed to parse/repair places:', e5, response);
          return NextResponse.json({ error: 'Failed to parse or repair places from AI response', raw: response }, { status: 500 });
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse/repair places:', e, response);
    return NextResponse.json({ error: 'Failed to parse or repair places from AI response', raw: response }, { status: 500 });
  }

  if (!places.length) {
    return NextResponse.json({ error: 'No places found in AI response', raw: response }, { status: 500 });
  }

  // Enrich each place with SERP API and geocode, fallback to AI-provided lat/lon if available
  const enriched = await Promise.all(places.map(async (p: any) => {
    let serp = null, geo = null;
    try { serp = await getPlaceInfo(p.name, city); } catch {}
    try { geo = await geocode(p.name, city); } catch {}
    return {
      ...p,
      rating: serp?.rating || p.rating,
      image: serp?.image || p.image,
      address: serp?.address || '',
      link: serp?.link || '',
      lat: geo?.lat ?? p.lat ?? null,
      lon: geo?.lon ?? p.lon ?? null,
      reviews: serp?.reviews || [],
    };
  }));

  return NextResponse.json({ places: enriched, response });
} 