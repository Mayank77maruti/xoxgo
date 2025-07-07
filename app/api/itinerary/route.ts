import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';

export async function POST(req: NextRequest) {
  const { city, budget, interests } = await req.json();
  if (!city || !budget || !interests) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  try {
    const itinerary = await getItinerary({ city, budget, interests });
    return NextResponse.json({ itinerary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
} 