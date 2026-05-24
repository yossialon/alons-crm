Test social media posting credentials without actually posting anything.

Run a dry-run test against the local server:
```
curl -s -X POST http://localhost:3000/api/agents/ad-machine/test-post \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}'
```

Parse the response and display:

**Credential Status**
For Instagram: show ✅ configured / ❌ not configured + list any missing vars
For Google Business: same

**Caption Preview**
Show the AI-generated caption that would be posted (from the `caption` field in the response)

**Next Steps**
- If both platforms are ❌: explain which env vars to add to .env.local
- If credentials are ✅ but user wants to do a real test post: tell them to run `/run-agent` and choose "test-post" with an image URL

If the server isn't running, say so clearly.
