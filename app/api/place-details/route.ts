import { NextRequest, NextResponse } from 'next/server';
import { getPlaceInfo } from '../../../lib/serp';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const place = searchParams.get('place');
  const city = searchParams.get('city');
  if (!place || !city) return NextResponse.json({ error: 'Missing place or city' }, { status: 400 });

  let tavily = { reviews: [], images: [] };
  let serp = { reviews: [], image: null };

  try {
    // Tavily
    const tavilyRes = await fetch('https://api.tavily.com/v1/place-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query: `${place}, ${city}` }),
    });
    const tavilyData = await tavilyRes.json();
    tavily = {
      reviews: tavilyData.reviews || [],
      images: tavilyData.images || []
    };
  } catch {}

  try {
    // SERP
    const serpData = await getPlaceInfo(place, city);
    serp = {
      reviews: serpData?.reviews || [],
      image: serpData?.image || null
    };
  } catch {}

  // Merge and deduplicate
  const allReviews = Array.from(new Set([...(tavily.reviews || []), ...(serp.reviews || [])]));
  const allImages = Array.from(new Set([...(tavily.images || []), ...(serp.image ? [serp.image] : [])]));

  return NextResponse.json({ reviews: allReviews, images: allImages });
} 