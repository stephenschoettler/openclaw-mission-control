# RETHINK.md — Overwatch Reality Check
*Written: 2026-03-01 · Author: Code Monkey*

---

## 1. What actually works reliably right now?

Tested manually via curl and the gateway API:

| Feature | Status | Notes |
|---------|--------|-------|
| Gateway restart button (/system) | ✅ Works | Calls systemctl, returns ok |
| Overwatch restart button (/system) | ✅ Works | Same |
| /api/office — agent list | ✅ Works | Returns agents from openclaw.json |
| /api/gateway — gateway health | ✅ Works | PID, uptime, memory |
| /api/costs — token cost breakdown | ✅ Works | Reads JSONL transcripts |
| Manual task board (SQLite) | ✅ Works | Tasks created by hand |
| Approvals queue | ✅ Works | POST/PATCH/approve flow works |
| Page loads (all routes) | ✅ All 200 | No crashed routes |
| Auth / login | ✅ Works | Cookie-based, secure |

---

## 2. What's fundamentally broken and why?

### Activity feed — root cause

**The data doesn't exist in a reliable form.**

OpenClaw has no event system. No webhooks, no pub/sub, no structured event log. What we have:

- `sessions.json` — metadata file per agent. Fields: `updatedAt`, `sessionId`, `sessionFile`. 
  No task description. No status. `updatedAt` gets touched by crons, heartbeats, and 
  routine bookkeeping — making it useless as an "agent is working" signal.
- JSONL session transcripts — messy multi-format logs. No standard "task started" / "task 
  ended" markers. The only signal is `stop_reason: "stop"` on the last assistant message.
- No field anywhere for "what is this session doing." The task text lives inside the first 
  user message, buried in context preamble written for the agent, not a dashboard.

Every fix we shipped today was parsing heuristics layered on unreliable signals. They worked 
until a new session format appeared, a cron touched the wrong file, or the preamble 
pattern didn't match.

**The activity feed cannot be reliable without an event source that doesn't exist.**

We HAVE a proper source we never used: the gateway `/tools/invoke` HTTP API returns live 
session data via `sessions_list` — real-time, accurate, no file parsing.

### Task board garbage titles — root cause

Same problem. We infer task descriptions by parsing the first user message from JSONL:

  [Subagent Context] You are running as a subagent...
  [Subagent Task]: You are Ralph — QA. Code Monkey here. Review this fix...

The task text IS the spawn instruction — written for the agent, not a dashboard. We've been 
stripping "You are X" prefixes with regex. Works until the phrasing changes.

There is no clean task field. The closest is `val.task` in sessions.json, but it's only 
populated for some spawn methods and still contains the full preamble.

### False active agents — root cause

`sessions.json` `updatedAt` is unreliable as a proxy for "agent is doing real work." 
Cron jobs and heartbeats write to it constantly. We fixed it by skipping `:cron:` sessions 
but the fundamental problem remains: we're using a file timestamp as a work indicator.

### Team page black screen — root cause

React state bug: navigate away and back → component tries to render before async data 
resolves → gets null → throws unhandled error. No error boundary. Fixable, not fixed.

---

## 3. What CAN we reliably build?

### The goldmine we ignored all day: Gateway HTTP API

```bash
POST http://127.0.0.1:18789/tools/invoke
Authorization: Bearer <token>
{"tool": "sessions_list", "args": {"activeMinutes": 10, "limit": 20}}
```

Returns: live session keys, accurate `updatedAt`, `totalTokens`, `contextTokens`, 
`model`, `sessionId`. Tested — works right now.

This gives us:
- **Who is active right now** — accurate to the second, no file stat guessing
- **Token usage per session** — real numbers
- **Context fill %** — totalTokens / contextTokens  
- **Session model** — which model each agent is running
- **Spawn relationships** — via `subagents` tool

### What's reliably readable from disk:
- **`openclaw.json`** — static agent roster. Never wrong.
- **`~/.openclaw/cron/jobs.json`** — cron schedule. Static, reliable.
- **SQLite DB** — what WE control: tasks, approvals, events, explicit activity posts.
- **`systemctl --user`** — service control. Works.

### What we CANNOT build reliably:
- Auto-detected "what task is this agent doing" — no structured data source
- Real-time activity feed from agent work — no event system in OpenClaw
- "Task completed" detection from JSONL — format too inconsistent, too fragile
- Accurate active/idle from sessions.json — mtime is poisoned by crons

---

## 4. What should we cut?

CUT:
- Session-derived activity feed entries (JSONL parsing)
- Session-derived task inference from JSONL
- "Last task" guessing from JSONL content
- Active/idle inference from sessions.json file mtime

KEEP but simplify:
- Activity feed — explicit posts only (agents call POST /api/activity at key moments)
- Task board — manual tasks only; agents post task_start/task_end via API
- Office/active status — replace scraping with gateway sessions_list call

KEEP as-is (working):
- System controls (restart buttons)
- Costs
- Approvals
- Cron schedule
- Manual task board

---

## 5. MVP Mr. Schoettler would actually use daily

Starting from "gateway restart is the most useful thing":

### Tier 1 — High value, reliable data (build/keep these)

1. **System controls** — gateway restart, Overwatch restart. Already works. ✅
2. **Live sessions panel** — gateway sessions_list every 15s. Who's running, 
   token count, context %, model, age. Accurate. No parsing.
3. **Cron schedule** — cron/jobs.json. What runs when, last run time. Static data, reliable.
4. **Costs** — token spend by agent, today/7d/30d. Already works. ✅

### Tier 2 — Works if agents cooperate

5. **Manual task board** — human-created tasks, agent status updates via API. 
   Simple kanban. Already works. ✅
6. **Approvals queue** — agents POST requests, human approves/rejects. 
   Already works. ✅

### Tier 3 — Don't build / already broken

- ~~Activity feed auto-populated from sessions~~ → replace with explicit agent posts only
- ~~Auto-detected task descriptions~~ → cut entirely  
- ~~Working/idle from sessions.json mtime~~ → replace with gateway sessions_list

---

## Recommended rebuild (2 focused days, not 1 chaotic one)

**Day 1: Fix the data sources**
- Replace /api/office active detection with gateway sessions_list call
  (fixes false active agents permanently, accurate to the second)
- Add a "Live Sessions" panel to Overview showing real data from gateway
- This alone makes Overview actually trustworthy

**Day 2: Cut the garbage, sharpen what works**  
- Strip activity feed to explicit-posts-only. Small. Accurate. Trustworthy.
- Update all agent AGENTS.md files: instruct them to post task_start/task_end events
- This is the only sustainable model — agents report their own work

**Don't touch:** Task board (manual), approvals, costs, system controls. They work.

The dashboard CAN be good. We built it on the wrong data sources.
The gateway HTTP API is the right foundation. One day of focused work on that 
beats three days of JSONL regex heuristics.
