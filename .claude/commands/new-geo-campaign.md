Create a hyper-local Meta Ads geo campaign for a specific city and zip code.

This triggers `createGeoCampaign(city, zip)` from src/agents/tools/meta-ads.ts.
Budget: $3/day for 7 days. Targets the zip code + 10 mile radius. Goes ACTIVE immediately.

**Step 1 — Gather info**
If city and zip were not provided in the command arguments, ask:
- "Which city? (e.g. Fort Lauderdale)"
- "What's the zip code?"

**Step 2 — Confirm**
Before proceeding, show a summary:
```
📍 New Geo Campaign
   City:    {city}, FL
   Zip:     {zip}
   Budget:  $3/day × 7 days = $21 total
   Status:  Will go ACTIVE immediately
   Note:    Deduplication check runs first — if a campaign for {city}
            was created in the last 8 days, this will be skipped.
```
Ask: "Create this campaign? (yes/no)"

**Step 3 — Execute**
Write a short Node.js/TypeScript snippet and run it using the project's tsconfig, OR
call the lead-hunter API with a fake single-lead payload that includes the city/zip
to trigger the geo campaign through the normal delegation flow.

The cleanest approach: remind the user that geo campaigns are normally triggered
automatically when lead-hunter imports leads from a new area. If they want to fire
one manually right now, they can:

1. Run the dev server (`npm run dev`)
2. Call:
```bash
curl -s -X POST http://localhost:3000/api/agents/ad-machine/job-complete \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "manual-test",
    "lead_name": "Test",
    "project_type": "Kitchen Cabinet",
    "city": "{city}",
    "zip": "{zip}"
  }'
```

Or offer to write a small one-off script that imports the meta-ads tool directly
and calls createGeoCampaign. Ask which approach they prefer.

**Step 4 — Result**
Show the campaign ID, ad set ID, and status from the response.
Remind the user: "Geo campaigns go ACTIVE immediately. Monitor spend in Meta Ads Manager."
