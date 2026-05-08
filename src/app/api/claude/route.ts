import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter: 30 Claude calls per IP per hour
const rateMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + hourMs });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Middleware already verified the session; this is defense-in-depth
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set in .env.local' },
      { status: 500 }
    );
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'local';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 30 AI requests per hour per IP.' },
      { status: 429 }
    );
  }

  const body = await req.json();

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
