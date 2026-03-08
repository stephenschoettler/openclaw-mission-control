# Overwatch Passive Data Brief

## Goal
Replace curl-based agent data reporting with passive reads of OpenClaw state files.

## Directory
`/home/w0lf/mission-control`

---

## Task 1: Tasks API — augment with live session data

File: `src/app/api/tasks/route.ts`

The GET handler currently only returns sqlite tasks. Update it to also return live subagent sessions as tasks:

### Session format
Sessions are stored in `~/.openclaw/agents/*/sessions/sessions.json`
Each entry has keys like `agent:dev:subagent:UUID` (subagent sessions) with fields:
- `sessionId` — UUID
- `updatedAt` — epoch ms  
- `task` — string (the subagent's task description) — MAY be absent
- `abortedLastRun` — bool
- `chatType` — "subagent" for subagents

To find subagent sessions: scan ALL agents' sessions.json files, collect entries where key contains `:subagent:`.

For each subagent session:
- If `updatedAt` was within last 10 minutes → status = "in-progress"  
- If `updatedAt` older than 10 minutes → status = "done"
- title = first 100 chars of `task` field, or "Subagent Task" if missing
- id = "session-" + sessionId
- assignee = agent dir name (from path)
- source = "session"

Return merged array: sqlite tasks first (source="manual"), then session-derived tasks sorted by updatedAt desc.

Keep POST/PATCH handlers unchanged.

---

## Task 2: Activity Feed — augment with session events

File: `src/app/api/activity/route.ts`

Update GET to also synthesize activity from session files:

Scan ALL `~/.openclaw/agents/*/sessions/sessions.json` files.
For each session entry:
- `id` = "sess-" + sessionId (virtual)
- `agent_id` = agent dir name
- `agent_name` = capitalized agent dir name
- `event_type` = "session_active" if updatedAt within last 30min, else "session_complete"
- `title` = for subagents: first 80 chars of task or "Subagent task"; for regular: "Session: " + agent_id
- `created_at` = ISO string from updatedAt

Merge with sqlite rows, sort all by created_at desc, return top 50.

Keep POST handler unchanged.

---

## Task 3: Fix missing sounds

File: `src/components/office/DiscoveryAnimation.tsx` around line 31

Comment out the audio creation and play call:
```ts
// const audio = new Audio('/sounds/discovery.mp3');
// audio.play().catch(() => {});
```
Guard it so it doesn't throw errors in browser console.

Also check `src/lib/fice/autowork-ticker.ts` and `src/lib/fice/watercooler-ticker.ts` for audio references and comment them out.

---

## Task 5: Build and verify

After all changes:
```bash
cd /home/w0lf/mission-control
rm -rf .next
npm run build
```

If build succeeds:
```bash
systemctl --user restart mission-control
sleep 3
curl -s http://localhost:3000/api/tasks | python3 -m json.tool | head -30
curl -s http://localhost:3000/api/activity | python3 -m json.tool | head -30
```

---

## Constraints
- Do NOT touch /api/agent-status — already passive
- Do NOT touch /api/office team listing — already passive
- Keep sqlite POST/PATCH endpoints working
- TypeScript — handle errors gracefully, all file reads try/catch

When completely done, run:
openclaw system event --text "Done: Overwatch passive data — tasks+activity from sessions, sounds fixed, build passed" --mode now
