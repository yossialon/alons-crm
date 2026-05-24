Audit .env.local and report which required env vars are set vs missing.

Read the file at: /Users/yossialon/program/alons-crm/.env.local

Check each group and print a report:

**Core (always required)**
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
- ORG_ID
- AGENT_SECRET

**Instagram + Google Business posting**
- INSTAGRAM_ACCESS_TOKEN
- INSTAGRAM_BUSINESS_ACCOUNT_ID
- GOOGLE_BUSINESS_ACCOUNT_ID
- GOOGLE_BUSINESS_LOCATION_ID
- GOOGLE_BUSINESS_CLIENT_ID
- GOOGLE_BUSINESS_CLIENT_SECRET
- GOOGLE_BUSINESS_REFRESH_TOKEN

**Meta Ads campaigns**
- META_AD_ACCOUNT_ID
- META_ACCESS_TOKEN
- META_PAGE_ID
- META_PIXEL_ID (optional)
- META_RETARGETING_AUDIENCE_ID (optional)

**WhatsApp alerts**
- META_WHATSAPP_ACCESS_TOKEN
- META_WHATSAPP_PHONE_NUMBER_ID
- OWNER_PHONE

**Lead Hunter**
- GOOGLE_PLACES_API_KEY
- LEAD_MIN_SCORE

Format each var as:
- ✅ VAR_NAME — set (show first 6 chars + … for confirmation, never the full value)
- ❌ VAR_NAME — MISSING
- ⚪ VAR_NAME — optional, not set

End with a summary: "X/Y required vars configured. Z optional vars missing."

Do NOT print actual secret values.
