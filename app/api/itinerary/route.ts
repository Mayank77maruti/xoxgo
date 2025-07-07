import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  try {
    // Use the text as the prompt for itinerary generation
    const itinerary = await getItinerary({ city: '', budget: '', interests: [text] });
    return NextResponse.json({ itinerary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
} 