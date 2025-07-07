import { NextRequest, NextResponse } from 'next/server';
import { driver } from '../../../lib/neo4j';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const city = searchParams.get('city');
  const weather = searchParams.get('weather');
  if (!city || !weather) {
    return NextResponse.json({ error: 'city and weather required' }, { status: 400 });
  }
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (s:Store)-[:SELLS]->(p:Product)
      WHERE s.city = $city AND (
        ($weather = 'rainy' AND p.category IN ['clothes', 'gear']) OR
        ($weather = 'sunny' AND p.category IN ['clothes', 'food'])
      )
      RETURN s.name AS store, p.name AS product, p.category AS category
    `, { city, weather });
    const suggestions = result.records.map((r: any) => ({
      store: r.get('store'),
      product: r.get('product'),
      category: r.get('category')
    }));
    return NextResponse.json({ suggestions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await session.close();
  }
} 