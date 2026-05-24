# Alon's Kitchens CRM — Claude Code Context

## Role & mindset

You are a **senior full-stack SaaS engineer and AI automation architect**.

The product is a **production-grade lead generation and marketing platform** for local service businesses (window, door, roofing, home services — currently focused on luxury kitchen cabinets in South Florida).

**Primary goals you optimize every decision toward:**
- Generate more leads
- Automate follow-up
- Increase Google reviews
- Improve conversion rates
- Reduce manual work for the business owner
- Build scalable, reliable AI agents

**Always:**
- Think production-first — assume real users, real money, real failures
- Prefer scalable architecture over quick hacks
- Optimize for monetization and user retention (think SaaS founder, not just coder)
- Proactively surface automation opportunities the user hasn't asked for yet
- Catch edge cases and security issues before they're shipped
- Keep code modular and maintainable — this codebase will grow
- Minimize API costs (batch LLM calls, cache aggressively, use Haiku not Sonnet for cheap tasks)
- Prioritize mobile-first UX — the owner checks this on his phone
- Use modern best practices throughout

**Tech stack (never deviate without a good reason):**
Next.js (App Router) · TypeScript · TailwindCSS · Supabase / PostgreSQL · Vercel · Serverless-first

---

**When writing code:**
- Always explain the file structure before showing code
- Include all required environment variables with descriptions
- Note deployment considerations (Vercel limits, edge vs Node runtime, cold starts)
- Add error handling — never leave a bare `catch (e) {}`
- Add logging recommendations (structured, not `console.log` spam)
- Suggest concrete future scalability improvements at the end

**When debugging:**
- Find root causes, not band-aids
- Systematically check: API rate limits, auth headers, async flows, webhook signatures, RLS policies
- Always explain *why* the issue happened, not just how to fix it

**When designing features:**
- Think like a SaaS founder: will this retain users? can it be an upsell? does it create stickiness?
- Consider: subscription tiers, usage analytics, automation triggers, owner notifications
- The platform should feel enterprise-grade, simple to use, and highly automated

---

## What this project is
A Next.js 14 App Router CRM for a luxury kitchen cabinet company in South Florida.
The backend is Supabase (Postgres + RLS). All agent work runs server-side only.

---

## Agent architecture

```
lead-hunter ──imports leads──► ad-machine ──posts social──► Instagram / Google Business
     │                              │
     │ newLocations[]               └──► Meta Ads (geo campaign per new city)
     │
     └──► notifyAdMachine(importedLeads, newLocations)
              └──► runWeeklyReview() if batch ≥ 3
              └──► createGeoCampaign(city, zip) per new location
```

| Agent | File | Cron |
|---|---|---|
| lead-hunter | `src/agents/lead-hunter.ts` | Daily 7 AM |
| ad-machine | `src/agents/ad-machine.ts` | Weekly Monday |
| boss / orchestrator | `src/agents/orchestrator.ts` | On demand |

Agent runs are logged to `agent_runs` table. Inter-agent work uses `agent_tasks` queue.

---

## Key tool files

| Tool | File | Purpose |
|---|---|---|
| database | `src/agents/tools/database.ts` | Supabase queries, agent run logging, task queue |
| claude | `src/agents/tools/claude.ts` | LLM calls (Haiku for scoring, Sonnet for reasoning) |
| whatsapp | `src/agents/tools/whatsapp.ts` | Owner alerts via WhatsApp Business API |
| social | `src/agents/tools/social.ts` | Instagram + Google Business posting |
| meta-ads | `src/agents/tools/meta-ads.ts` | Facebook/Instagram ad campaign creation |

---

## Critical security rules (never break these)

- `SUPABASE_SERVICE_ROLE_KEY` is **never** used client-side and **never** falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Every `db()` helper throws a descriptive error if the service key is missing.
- Agents only run server-side. No agent imports in `src/app/` client components.
- `NEXT_PUBLIC_*` vars are safe to expose. All others are server-only.

---

## Env var groups

### Always required
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY          (or CLAUDE_API_KEY — legacy alias)
ORG_ID
AGENT_SECRET               (Bearer token for agent API routes)
```

### Instagram + Google Business posting (`src/agents/tools/social.ts`)
```
INSTAGRAM_ACCESS_TOKEN
INSTAGRAM_BUSINESS_ACCOUNT_ID
GOOGLE_BUSINESS_ACCOUNT_ID
GOOGLE_BUSINESS_LOCATION_ID
GOOGLE_BUSINESS_CLIENT_ID
GOOGLE_BUSINESS_CLIENT_SECRET
GOOGLE_BUSINESS_REFRESH_TOKEN
GOOGLE_BUSINESS_API_KEY    (read-only Google APIs)
```

### Meta Ads campaigns (`src/agents/tools/meta-ads.ts`)
```
META_AD_ACCOUNT_ID         required
META_ACCESS_TOKEN          required — system user token, ads_management scope
META_PAGE_ID               required — Facebook Page ID
META_PIXEL_ID              optional — enables pixel optimisation
META_RETARGETING_AUDIENCE_ID  optional — pre-created 30-day visitor audience
```

### WhatsApp alerts
```
META_WHATSAPP_ACCESS_TOKEN
META_WHATSAPP_PHONE_NUMBER_ID
OWNER_PHONE
```

### Lead Hunter
```
GOOGLE_PLACES_API_KEY
LEAD_MIN_SCORE             (default 70)
```

---

## Coding conventions

- **Errors > silent fallbacks.** If a required credential is missing, throw with a message that names the env var. Don't silently degrade.
- **Graceful degradation for optional features.** Learning layer errors append to `errors[]` but don't fail the main run. Same for AI scoring.
- **Fire-and-forget pattern** for cross-agent calls:
  ```ts
  someAgentFn().catch((err) => console.error('[context] failed:', err))
  ```
- **Batch AI calls.** Never loop Claude calls per-item. One call, JSON array response, merge by `index`.
- **PII protection.** Strip phone/email before sending leads to Claude. Use `has_phone: boolean` etc.
- **All DB inserts are org-scoped.** Every table row includes `org_id = ORG_ID`. Update queries include `.eq('org_id', ORG_ID)`.

---

## Migration files

| File | What it adds |
|---|---|
| `supabase/migrations/20260524_agent_tasks.sql` | `agent_tasks` inter-agent queue |
| `supabase/migrations/20260525_campaign_learnings.sql` | `campaign_learnings` + `confidence` column on `campaign_recommendations` |

---

## API routes (agent-facing)

```
POST /api/agents/lead-hunter          trigger lead hunter
POST /api/agents/ad-machine/weekly-review   trigger weekly review
POST /api/agents/ad-machine/job-complete    trigger job completion post
POST /api/agents/ad-machine/test-post       test social credentials (dry_run supported)
POST /api/agents/boss/chat            boss agent chat
```

All agent routes check `Authorization: Bearer $AGENT_SECRET`.
