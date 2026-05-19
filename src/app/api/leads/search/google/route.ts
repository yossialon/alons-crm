import { NextRequest, NextResponse } from 'next/server';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? '';

// Uses the Places API (New) — https://developers.google.com/maps/documentation/places/web-service/text-search
export async function POST(req: NextRequest) {
  if (!PLACES_KEY) return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
  const { query, area } = await req.json() as { query: string; area: string };

  // New Places API — Text Search
  const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri,places.editorialSummary',
    },
    body: JSON.stringify({
      textQuery: `${query} in ${area} Florida`,
      maxResultCount: 8,
      languageCode: 'en',
    }),
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({})) as { error?: { message?: string } };
    return NextResponse.json(
      { error: err.error?.message ?? 'Google Places search failed' },
      { status: searchRes.status }
    );
  }

  type Place = {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    editorialSummary?: { text?: string };
  };

  const data = await searchRes.json() as { places?: Place[] };
  const places = data.places ?? [];

  const leads = places.map((place) => ({
    name: place.displayName?.text ?? 'Unknown',
    phone: place.nationalPhoneNumber ?? '',
    email: '',
    website: place.websiteUri ?? '',
    area,
    type: 'Contractor',
    source: 'Google Maps',
    rating: place.rating ? String(place.rating) : '',
    notes: place.editorialSummary?.text ?? place.formattedAddress ?? '',
  }));

  return NextResponse.json({ leads });
}
