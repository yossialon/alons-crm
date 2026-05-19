export async function enrichLead(domain: string): Promise<string | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json() as { data?: { emails?: { value?: string; confidence?: number }[] } };
    const emails = data.data?.emails ?? [];
    const best = emails.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    return best?.value ?? null;
  } catch {
    return null;
  }
}
