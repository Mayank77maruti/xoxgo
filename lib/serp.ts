const SERP_API_KEY = process.env.SERP_API_KEY;

export async function getPlaceInfo(place: string, city: string) {
  const q = encodeURIComponent(`${place} ${city}`);
  const url = `https://serpapi.com/search.json?q=${q}&engine=google_maps&api_key=${SERP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('SERP API error');
  const data = await res.json();
  // Try to extract the first place result
  const result = data.local_results?.[0] || data.place_results || null;
  if (!result) return null;
  return {
    rating: result.rating || null,
    image: result.thumbnail || result.photos?.[0]?.thumbnail || null,
    reviews: result.reviews || null,
    address: result.address || null,
    link: result.link || null
  };
} 