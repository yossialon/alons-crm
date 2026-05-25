# Production Launch Checklist

> Alon's Kitchens CRM — Pre-launch, Smoke Test, Rollback & Incident Response

---

## 1. Environment Variables Checklist

Set all of the following in Vercel → Settings → Environment Variables (Production):

### Required (app will not start without these)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Server-side only; never expose client-side
- [ ] `SESSION_SECRET` — ≥64 hex chars. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] `ORG_ID` — UUID of the primary organization row
- [ ] `ANTHROPIC_API_KEY` — Starts with `sk-ant-`
- [ ] `NEXT_PUBLIC_APP_URL` — Exact production URL, e.g. `https://crm.alonskitchens.com`

### Billing (required if Stripe is active)
- [ ] `STRIPE_SECRET_KEY` — Live key: `sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` — `whsec_...` from Stripe dashboard webhook endpoint
- [ ] `STRIPE_PRO_MONTHLY_PRICE_ID`
- [ ] `STRIPE_PRO_YEARLY_PRICE_ID`
- [ ] `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`
- [ ] `STRIPE_ENTERPRISE_YEARLY_PRICE_ID`

### Agent integrations (required for agents to run)
- [ ] `AGENT_SECRET` — ≥32 chars, matches `Authorization: Bearer` header in cron calls
- [ ] `META_WHATSAPP_ACCESS_TOKEN`
- [ ] `META_WHATSAPP_PHONE_NUMBER_ID`
- [ ] `OWNER_PHONE` — E.164 format, e.g. `+19545551234`
- [ ] `GOOGLE_PLACES_API_KEY`
- [ ] `INSTAGRAM_ACCESS_TOKEN`
- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- [ ] `META_AD_ACCOUNT_ID`
- [ ] `META_ACCESS_TOKEN`
- [ ] `META_PAGE_ID`

### Optional but recommended
- [ ] `SENTRY_DSN` — Error tracking
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Rate limiting

---

## 2. Database Pre-launch

### Step 0: Run the base schema FIRST
In Supabase Dashboard → SQL Editor, run the entire contents of:
`scripts/schema.sql`

This creates the core tables (`organizations`, `users`, `leads`, `campaigns`,
`campaign_sends`, `password_reset_tokens`, etc.) that the migrations depend on.
Only THEN run the migrations below in order.

### Run migrations in order
```sql
-- In Supabase dashboard → SQL Editor, run each file:
supabase/migrations/20260519_job_completions.sql
supabase/migrations/20260519_meta_social.sql
supabase/migrations/20260520_agents.sql
supabase/migrations/20260520_creative_studio.sql
supabase/migrations/20260520_social_messages_webhook.sql
supabase/migrations/20260524_agent_tasks.sql
supabase/migrations/20260525_campaign_learnings.sql
supabase/migrations/20260526_rls_policies.sql
supabase/migrations/20260526_indexes.sql
supabase/migrations/20260526_schema_fixes.sql
supabase/migrations/20260527_billing_price_id.sql
supabase/migrations/20260528_fix_subscription_status.sql
supabase/migrations/20260528_rls_campaigns.sql
```

### Verify RLS
- [ ] Open Supabase dashboard → Table Editor
- [ ] Confirm every table shows "RLS enabled"
- [ ] Test as anon user — should get zero rows on `organizations`, `users`, `leads`

---

## 3. Stripe Setup

- [ ] Create live Products & Prices (see `docs/stripe-testing-guide.md`)
- [ ] Register webhook endpoint: `https://your-domain.com/api/billing/webhook`
- [ ] Subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.upcoming`
- [ ] Configure Customer Portal (Billing → Customer portal → Activate)
- [ ] Test checkout flow with a real card before launch

---

## 4. Vercel Deployment Checklist

- [ ] `vercel.json` has correct `maxDuration` per function (300s for agents, 120s for boss/chat, 60s for cron)
- [ ] Crons configured: lead-hunter `0 7 * * *`, ad-machine `0 9 * * 1`, outreach `0 * * * *`
- [ ] `.vercelignore` excludes `google-cloud-cli-*`, `data/`, `scripts/`
- [ ] Verify Vercel build succeeds: `npx next build` locally with production env vars
- [ ] Set `VERCEL_ENV=production` (auto-set by Vercel — verify it's not overridden)

---

## 5. Smoke Test Checklist

Run these immediately after deploying to production:

### Auth
- [ ] Visit `/` — redirects to `/login` ✓
- [ ] Log in with valid credentials — redirects to `/dashboard` ✓
- [ ] Refresh page — session persists ✓
- [ ] Log out — redirects to `/login` ✓

### Core CRM
- [ ] Dashboard loads, shows stat cards ✓
- [ ] Leads tab loads, shows existing leads ✓
- [ ] Add a test lead — appears in list ✓
- [ ] Update lead status via Kanban ✓
- [ ] Delete the test lead ✓

### Billing
- [ ] Settings → Upgrade to Pro → Stripe checkout loads ✓
- [ ] Use test card `4242 4242 4242 4242` → subscription activates ✓
- [ ] Settings shows "Pro" plan with correct limits ✓
- [ ] Manage Billing → Stripe portal loads ✓

### Agents
- [ ] Settings → Agents → Run Lead Hunter manually → completes without error ✓
- [ ] Check `agent_runs` table in Supabase — row inserted ✓
- [ ] WhatsApp notification received on owner phone ✓

### System health
- [ ] Settings → System → Run Check → all services green ✓
- [ ] Verify no errors in Vercel function logs ✓

### Webhooks
- [ ] Meta webhook endpoint: `GET /api/webhooks/meta/leads?hub.challenge=test` → returns challenge ✓
- [ ] Stripe webhook: send test event from dashboard → returns 200 ✓

---

## 6. Rollback Plan

If a deployment causes critical failures:

### Immediate rollback (< 2 minutes)
```bash
# Roll back to previous deployment in Vercel dashboard:
# Deployments → previous deploy → ••• → Redeploy (Promote to production)
# OR via CLI:
vercel rollback
```

### Database rollback
If the schema migration caused issues:
```sql
-- Migrations are additive (ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)
-- They are safe to re-run. To undo the billing price_id column:
ALTER TABLE organizations DROP COLUMN IF EXISTS stripe_price_id;
DROP INDEX IF EXISTS idx_organizations_stripe_customer;
```

### Env var emergency kill switches
- Set `DISABLE_AUTH=true` in Vercel **only in development** — has no effect in production (by design)
- To disable crons temporarily: remove `"crons"` key from `vercel.json` and redeploy

---

## 7. Incident Response Checklist

When something goes wrong in production:

### Triage (first 5 minutes)
1. Check Vercel function logs → Filter by error level
2. Check Sentry for error clusters (if DSN is set)
3. Check Supabase dashboard → API logs for DB errors
4. Identify: is it a single route? A whole feature? All users?

### Common failure patterns

| Symptom | Likely cause | Fix |
|---|---|---|
| All pages 401 | `SESSION_SECRET` changed or rotated | Restore previous value; users need to re-login |
| DB queries fail | `SUPABASE_SERVICE_ROLE_KEY` expired/wrong | Update in Vercel env vars |
| Agents return 403 | `AGENT_SECRET` mismatch | Check cron calls match the env var |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` wrong | Re-copy from Stripe dashboard |
| WhatsApp alerts silent | `META_WHATSAPP_ACCESS_TOKEN` expired | Refresh token (Meta tokens expire) |
| High latency | DB cold start | Check Supabase plan; consider connection pooler |

### Communication
- Owner phone: send WhatsApp alert (the bot itself will try; if the bot is down, send manually)
- Active sessions: no session invalidation on deploy (JWT-based, TTL 7 days)

### Post-incident
1. Write a one-paragraph incident note in `docs/incidents/`
2. Add a test case for the failure mode
3. Review alert thresholds in `TECH_ALERT_THRESHOLD_MS`

---

## 8. Ongoing Maintenance

- **Weekly**: Review `agent_runs` table for errors, failed outreach runs
- **Monthly**: Rotate `SESSION_SECRET` (all sessions invalidated — notify users)
- **Quarterly**: Review Stripe price IDs, update CSP if new third-party scripts added
- **On Meta token expiry**: Refresh `META_WHATSAPP_ACCESS_TOKEN`, `INSTAGRAM_ACCESS_TOKEN`

---

## 9. Architecture Notes for Future Engineers

| Layer | Technology | Key files |
|---|---|---|
| Auth | JWT/jose (HS256, 7d TTL, httpOnly cookie) | `src/lib/session.ts`, `src/middleware.ts` |
| DB access | Supabase service-role singleton (Proxy pattern) | `src/lib/supabase-server.ts` |
| Billing | Stripe SDK v22 + webhook | `src/lib/stripe.ts`, `src/app/api/billing/` |
| Agents | Server-side only, `AGENT_SECRET` Bearer auth | `src/agents/`, `src/app/api/agents/` |
| Rate limiting | Upstash REST → ioredis → in-memory fallback | `src/lib/rateLimit.ts` |
| Logging | Structured JSON (prod) / colored (dev) + Sentry | `src/lib/logger.ts` |
| Env validation | Zod schema, validated at first request | `src/lib/env.ts` |
| Error boundaries | React class component wrapping every tab | `src/components/ErrorBoundary.tsx` |
| CSP | Configured in `next.config.mjs` headers | Review when adding new third-party services |
