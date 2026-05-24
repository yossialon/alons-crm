Show the status of all recent agent runs.

Call the local API:
```
curl -s http://localhost:3000/api/agents/runs \
  -H "Authorization: Bearer $AGENT_SECRET"
```

Parse the JSON and display a clean table with columns:
- Agent name
- Status (use emoji: ✅ success, ⚠️ partial, ❌ error, 🔄 running)
- Trigger (cron / manual / webhook / auto-delegation)
- Started at (relative time, e.g. "3 min ago")
- Summary (truncated to 80 chars)

Show the 10 most recent runs. Group by agent name with a blank line between groups.

If the server is not running, say so clearly and suggest running `npm run dev`.
