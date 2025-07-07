import { NextRequest, NextResponse } from 'next/server';
import { getItinerary } from '../../../lib/groqAgent';

export async function POST(req: NextRequest) {
  const { question, itinerary } = await req.json();
  if (!question || !itinerary) {
    return NextResponse.json({ error: 'Missing question or itinerary' }, { status: 400 });
  }
  // Use GROQ to answer the question based on the itinerary
  const prompt = `Given this itinerary: ${JSON.stringify(itinerary)}\nAnswer this question: ${question}`;
  const response = await getItinerary({ city: '', budget: '', interests: [question, 'qa'] });
  // Use the full response as the answer
  return NextResponse.json({ answer: response });
} 