import { NextRequest, NextResponse } from 'next/server';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6'; // FIXED: upgraded to claude-sonnet-4-6

export async function POST(req: NextRequest) {
  if (!CLAUDE_API_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const { job_type, description, area, customer_name } = await req.json() as {
    job_type: string; description: string; area: string; customer_name: string;
  };

  const prompt = `You are a social media manager for Alon's Kitchens, a custom cabinet and kitchen remodeling company in South Florida.

Generate 3 social media captions for a completed job:
- Job type: ${job_type}
- Description: ${description}
- Area: ${area}, Florida
- Customer: ${customer_name}

Return ONLY valid JSON (no markdown) in this exact format:
{
  "instagram": "caption with relevant hashtags #KitchenRemodel #SouthFlorida #CustomCabinets #BocaRaton etc — professional, aspirational, 150-220 chars before hashtags, 15-20 relevant hashtags",
  "google": "short Google Business post, 100-150 chars, local SEO focused, mentions ${area} FL, no hashtags",
  "nextdoor": "friendly neighbor tone post, 100-180 chars, mentions we work in the neighborhood, offers free estimate to neighbors, warm and personal"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': CLAUDE_API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json() as { content?: { type: string; text?: string }[]; error?: { message: string } };
  if (!res.ok || data.error) return NextResponse.json({ error: data.error?.message ?? 'AI failed' }, { status: 500 });

  const text = (data.content ?? []).filter(b => b.type === 'text').map(b => b.text ?? '').join('');
  try {
    const captions = JSON.parse(text.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    return NextResponse.json(captions);
  } catch {
    return NextResponse.json({ error: 'Failed to parse captions', raw: text }, { status: 500 });
  }
}
