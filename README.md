# Alon's CRM

A mobile-first CRM for Alon's Kitchens — kitchen cabinet sales and installation in South Florida. Includes lead management, outreach automation, job completion tracking, and a unified Meta/Social inbox.

---

## Quick Start

```bash
cp .env.local.example .env.local
# fill in .env.local (see sections below)
npm install
npm run dev
```

Run the database schema (Supabase / Neon / local Postgres):

```bash
psql $DATABASE_URL -f scripts/schema.sql
# Then apply migrations in order:
psql $DATABASE_URL -f supabase/migrations/20260519_job_completions.sql
psql $DATABASE_URL -f supabase/migrations/20260519_meta_social.sql
psql $DATABASE_URL -f supabase/migrations/20260520_social_messages_webhook.sql
```

---

## Meta / Facebook / Instagram / WhatsApp Setup

The CRM integrates with three Meta products:

| Product | What it does |
|---|---|
| **Facebook Lead Ads** | Auto-imports lead form submissions in real time |
| **Instagram Comments** | Auto-sends a personalised DM to anyone who comments on a post |
| **WhatsApp Business** | Auto-replies to incoming messages; flags hot leads |

### Required environment variables

```env
# Meta Developer Console → https://developers.facebook.com/
META_APP_ID=              # Your Meta App ID
META_APP_SECRET=          # Your Meta App Secret (used to verify webhook signatures)

# Webhook verify token — pick any random string; set the same value in Meta dashboard
META_WEBHOOK_VERIFY_TOKEN=alons_verify_token

# Facebook Page access token (Graph API → your page → Generate token)
META_PAGE_ACCESS_TOKEN=

# WhatsApp Business API
# Meta Business Suite → WhatsApp → API Setup → Phone Number ID
META_WHATSAPP_PHONE_NUMBER_ID=
# Permanent system-user token with whatsapp_business_messaging permission
META_WHATSAPP_ACCESS_TOKEN=

# Instagram Business Graph API
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_ACCESS_TOKEN=

# Feature flags (set to 'false' to disable)
INSTAGRAM_AUTO_REPLY=true
WHATSAPP_AUTO_REPLY=true
```

---

### Step-by-step Meta setup

#### Step 1 — Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com/) and sign in with your Facebook account.
2. Click **My Apps → Create App**.
3. Choose **Business** as the app type.
4. Give it a name (e.g. "Alon's CRM") and link your Business Manager account.

#### Step 2 — Add and configure products

In the app dashboard, add these products:

- **Webhooks** — for receiving Lead Ads and message notifications
- **WhatsApp Business Platform** — for WhatsApp messaging
- **Messenger** (optional) — for Instagram DMs via Messenger API

#### Step 3 — Configure the webhook

1. In the app dashboard → **Webhooks → Configure**.
2. Set **Callback URL** to:
   ```
   https://your-domain.com/api/webhooks/meta/leads
   ```
3. Set **Verify Token** to the same value as `META_WEBHOOK_VERIFY_TOKEN` in your `.env.local`.
4. Click **Verify and Save**.
5. Subscribe to these webhook fields:
   - `leadgen` — Facebook Lead Ads submissions
   - `messages` — WhatsApp and Instagram DMs
   - `comments` — Instagram post comments (for auto-DM)

> **WhatsApp webhook URL:** `https://your-domain.com/api/webhooks/meta/whatsapp`
>
> **Instagram webhook URL:** `https://your-domain.com/api/webhooks/meta/instagram`

#### Step 4 — Get your access tokens

**Facebook Page token:**
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your app and your page.
3. Request permissions: `pages_messaging`, `leads_retrieval`.
4. Generate token → copy into `META_PAGE_ACCESS_TOKEN`.

**WhatsApp token:**
1. Meta Business Suite → **WhatsApp → Getting Started**.
2. Copy the **Phone Number ID** into `META_WHATSAPP_PHONE_NUMBER_ID`.
3. Create a permanent System User token with `whatsapp_business_messaging` permission → copy into `META_WHATSAPP_ACCESS_TOKEN`.

**Instagram token:**
1. App Dashboard → **Instagram Basic Display → User Token Generator**.
2. Copy the token into `INSTAGRAM_ACCESS_TOKEN`.
3. Copy your Instagram Business Account ID into `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

#### Step 5 — Create your first Lead Ad

1. Go to [Meta Ads Manager](https://adsmanager.facebook.com/).
2. Create a new campaign with the **Lead Generation** objective.
3. At the ad set level, choose your Facebook Page.
4. At the ad level, create an **Instant Form** with fields: Name, Phone, Email.
5. Publish the ad.

When someone submits the form, the CRM automatically:
- Receives the lead via webhook
- Verifies the signature with `META_APP_SECRET`
- Creates a new lead in the database with `source: "Facebook Ad"`
- Scores the lead and sets potential (high/medium/low)
- Records ad name, form name, and campaign name in the `ad_leads` table

---

### Webhook security

Every incoming webhook request from Meta is verified using HMAC-SHA256:

```
X-Hub-Signature-256: sha256=<hmac of request body with APP_SECRET>
```

The verification happens in `src/lib/meta.ts → verifyMetaSignature()`. In development, if `META_APP_SECRET` is not set, verification is skipped.

---

### How the auto-reply works

All auto-replies are generated by Claude (`claude-sonnet-4-5`) with business context baked in:

- Business: Alon's Kitchens — kitchen cabinet sales and installation, South Florida
- Keeps replies under 3 sentences
- Offers a free in-home estimate for price/cost questions
- If after hours (before 8 AM or after 6 PM): acknowledges and says the team will follow up in the morning
- Never mentions being an AI

Toggle auto-reply on/off per channel in **Settings → Meta & Social**.

---

### Toggling auto-reply via database

Auto-reply settings are stored in the `app_settings` table and can be toggled via the Settings tab UI or directly:

```sql
-- Disable WhatsApp auto-reply
INSERT INTO app_settings (org_id, key, value)
VALUES ('00000000-0000-0000-0000-000000000001', 'whatsapp_auto_reply', 'false')
ON CONFLICT (org_id, key) DO UPDATE SET value = 'false';
```

---

## Project structure

```
src/
  app/
    api/
      webhooks/meta/
        leads/route.ts        ← Facebook Lead Ads webhook (GET: verify, POST: receive)
        instagram/route.ts    ← Instagram comment → auto-DM
        whatsapp/route.ts     ← WhatsApp auto-reply
      social/
        messages/route.ts     ← Unified inbox messages API
        ad-leads/route.ts     ← Facebook/Instagram ad leads
        suggest-reply/route.ts ← Claude-powered reply suggestions
        instagram-send/route.ts
        instagram-interactions/route.ts
      settings/route.ts       ← App settings (auto-reply toggles etc.)
  components/
    tabs/
      SocialTab.tsx           ← Unified Meta inbox (WhatsApp / Instagram / Ad Leads)
      MarketingTab.tsx        ← Meta performance analytics + job feed
      SettingsTab.tsx         ← Auto-reply toggles, setup guide, connection status
  lib/
    meta.ts                   ← verifyMetaSignature, sendWhatsAppMessage,
                                 sendInstagramDM, getLeadAdData, generateSocialReply
    scoring.ts                ← Lead scoring (0–100)

supabase/migrations/
  20260519_meta_social.sql              ← instagram_interactions, social_messages, ad_leads, app_settings
  20260520_social_messages_webhook.sql  ← Reconciles schema for webhook inserts
```

---

## Database tables (Meta-related)

| Table | Purpose |
|---|---|
| `ad_leads` | Tracks which lead came from which Facebook/Instagram ad and campaign |
| `social_messages` | Unified inbox for WhatsApp and Instagram DM threads |
| `instagram_interactions` | Log of every Instagram comment and the auto-DM response sent |
| `app_settings` | Per-org key/value store for feature flags (auto-reply toggles) |

---

## Development tips

- **Test webhooks locally:** Use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose your local server to Meta.
  ```bash
  ngrok http 3000
  # Use the https URL as your webhook callback URL in Meta dashboard
  ```
- **Simulate a Lead Ad submission:** Use Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/) in the app dashboard.
- **Skip signature verification in dev:** Leave `META_APP_SECRET` empty — `verifyMetaSignature` returns `true` when the secret is not set.
- **Mock WhatsApp messages:** POST directly to `/api/webhooks/meta/whatsapp` with a `whatsapp_business_account` payload (signature check skipped in dev).
