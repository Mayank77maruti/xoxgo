import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getItinerary({ city, budget, interests }: { city: string; budget: string; interests: string[] }) {
  const prompt = `
You are an AI travel agent. Suggest a personalized itinerary for a trip to ${city} with a budget of ${budget} and interests: ${interests.join(', ')}.
For each activity, return a structured JSON with:
- location (string)
- best_time_to_visit (string)
- cost (number)
- highlights (string)
- image (string, URL to a photo if possible)
Respond ONLY with a valid JSON object, no extra text, no markdown, no code fences, no explanation.
Format the response as:
{
  "itinerary": [
    {
      "day": 1,
      "activities": [
        {
          "location": "...",
          "best_time_to_visit": "...",
          "cost": ...,
          "highlights": "...",
          "image": "..."
        }
      ]
    }
  ]
}
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: true,
    stop: null,
  });

  let result = '';
  for await (const chunk of chatCompletion) {
    result += chunk.choices[0]?.delta?.content || '';
  }
  return result;
} 