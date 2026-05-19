import { NextRequest, NextResponse } from 'next/server';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? '';

export async function POST(req: NextRequest) {
  if (!PLACES_KEY) return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
  const { query, area } = await req.json() as { query: string; area: string };

  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + area + ' Florida')}&key=${PLACES_KEY}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json() as { results?: { place_id: string; name: string; formatted_address?: string; rating?: number }[] };

  const places = (searchData.results ?? []).slice(0, 8);

  const leads = await Promise.all(places.map(async (place) => {
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,rating,editorial_summary&key=${PLACES_KEY}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json() as { result?: { formatted_phone_number?: string; website?: string; editorial_summary?: { overview?: string } } };
    const detail = detailData.result ?? {};

    return {
      name: place.name,
      phone: detail.formatted_phone_number ?? '',
      email: '',
      website: detail.website ?? '',
      area,
      type: 'Contractor',
      source: 'Google Maps',
      rating: place.rating ? String(place.rating) : '',
      notes: detail.editorial_summary?.overview ?? place.formatted_address ?? '',
    };
  }));

  return NextResponse.json({ leads });
}
