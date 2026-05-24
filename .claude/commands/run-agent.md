Manually trigger one of the CRM agents.

If the user didn't specify an agent name in the command, ask them to choose:
1. lead-hunter — search for new leads (Google Places, permits, competitor reviews, web)
2. ad-machine weekly-review — analyse campaign performance and generate recommendations
3. ad-machine test-post (dry run) — verify social media credentials without posting

Then trigger the chosen agent:

**lead-hunter:**
```
curl -s -X POST http://localhost:3000/api/agents/lead-hunter \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"manual"}'
```

**ad-machine weekly-review:**
```
curl -s -X POST http://localhost:3000/api/agents/ad-machine/weekly-review \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"manual"}'
```

**ad-machine test-post (dry run):**
```
curl -s -X POST http://localhost:3000/api/agents/ad-machine/test-post \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}'
```

Display the result as a readable summary — not raw JSON. Show counts (leads found/imported), errors, and any recommendations generated.

Note: $AGENT_SECRET should be set in your shell. If the curl fails with 401, remind the user to set it:
`export AGENT_SECRET=alonskitchens-agents-2026`
