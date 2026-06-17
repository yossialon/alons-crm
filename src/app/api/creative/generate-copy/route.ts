import { NextRequest, NextResponse } from 'next/server';

const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

export async function POST(req: NextRequest) {
  const { templateType, jobType, area, brandVoice, businessName, tagline } = await req.json() as {
    templateType: string;
    jobType?: string;
    area?: string;
    brandVoice: string;
    businessName: string;
    tagline?: string;
  };

  if (!CLAUDE_KEY) {
    return NextResponse.json({ variations: getFallbackCopy(templateType, jobType, area) });
  }

  const voiceMap: Record<string, string> = {
    'luxury-sophisticated': 'luxury, sophisticated, premium — use elevated language, evoke aspiration',
    'friendly-local':       'warm, friendly, community-focused — use conversational language, feel approachable',
    'bold-confident':       'bold, direct, powerful — use strong action words, high energy',
    'warm-trustworthy':     'warm, trustworthy, reliable — use reassuring language, emphasize expertise',
  };

  const prompt = `You are a professional ad copywriter for ${businessName} — a custom kitchen cabinet, vanity, and renovation company in South Florida.
Brand voice: ${voiceMap[brandVoice] ?? 'professional and premium'}
${tagline ? `Tagline: "${tagline}"` : ''}

Generate 3 copy variations for a ${templateType} ad creative.
${jobType ? `Job type: ${jobType}` : ''}
${area ? `Location: ${area}` : ''}

For each variation, provide:
- headline (max 8 words, punchy)
- subheadline (max 12 words, supporting detail)
- cta (max 4 words, action-focused)

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "variations": [
    { "headline": "...", "subheadline": "...", "cta": "..." },
    { "headline": "...", "subheadline": "...", "cta": "..." },
    { "headline": "...", "subheadline": "...", "cta": "..." }
  ]
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': CLAUDE_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5', // FIXED: removed stale date-versioned ID
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json() as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).find(b => b.type === 'text')?.text ?? '{}';
    // Strip any markdown code fences if present
    const clean = text.replace(/```(?:json)?\n?/g, '').trim();
    const parsed = JSON.parse(clean) as { variations: { headline: string; subheadline: string; cta: string }[] };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ variations: getFallbackCopy(templateType, jobType, area) });
  }
}

function getFallbackCopy(type: string, jobType?: string, area?: string) {
  const job = jobType || 'kitchen';
  const loc = area || 'South Florida';
  if (type === 'before-after') return [
    { headline: `${job} Transformation`, subheadline: `See the stunning results in ${loc}`, cta: 'Get Free Estimate' },
    { headline: 'From Dated to Stunning', subheadline: `Custom cabinets built for ${loc} homes`, cta: 'Call Today' },
    { headline: 'Your Dream Kitchen Awaits', subheadline: `Premium craftsmanship. Delivered on time.`, cta: 'Book a Consult' },
  ];
  return [
    { headline: 'Premium Custom Cabinets', subheadline: `Serving ${loc} with luxury craftsmanship`, cta: 'Free Estimate' },
    { headline: 'Transform Your Space', subheadline: `Award-winning designs for your home`, cta: 'Call Now' },
    { headline: 'Quality You Can See', subheadline: `Custom ${job} solutions, South Florida`, cta: 'Get Started' },
  ];
}
