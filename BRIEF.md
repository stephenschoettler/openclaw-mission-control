# BRIEF: Fix Active Agent Sync + Display Issues

## Context
Mission Control at `/home/w0lf/mission-control` is a Next.js app.

## Bug 1: Home page and /team show DIFFERENT active agents

### Root Cause
- `/team` page → calls `/api/agent-status` → reads `sessions.json` content, checks individual session `updatedAt` timestamps → accurate
- Home page (page.tsx) → calls `/api/office` → uses `sessions.json` mtime → inaccurate/different

### Fix
Change the home page to call `/api/agent-status` instead of `/api/office` for agent status.

In `src/app/page.tsx`:
1. Change the fetch from `/api/office` to `/api/agent-status`
2. The `/api/agent-status` response is `AgentStatus[]` with fields: `{ id, name, role, status, lastActiveMs, lastTask, workspace, model, sessionId }`
3. Map this to work with the existing stations state:
   - agent_id → id
   - agent_name → use the DISPLAY NAME from the map below (not a.name from config)
   - status → status ('working' or 'idle')
   - current_task → lastTask
   - updated_at → DON'T use this; instead use lastActiveMs for time display

### Display Name Map (use these)
main → Babbage
answring → Maya
answring-sales → Sal
answring-qa → Quinn
answring-strategist → Stella
answring-ops → Opie
answring-dev → Devin
answring-marketing → Marcus
answring-security → Cera
code-monkey → Code Monkey
code-frontend → Frontend
code-backend → Backend
code-devops → DevOps
code-webdev → WebDev
ralph → Ralph
tldr → Cliff
browser → Crawler
forge → Forge
hustle → Hustle
roadie → Roadie
docs → The Professor

## Bug 2: "Updated 100536 ms" — not human readable

In `src/app/page.tsx` line 266:
  <p>Updated {relativeTime(agent.updated_at)}</p>

After the fix, agent.updated_at won't exist. Use lastActiveMs (a number in ms).
Add a timeAgoMs(ms: number) helper:
  if (!ms) return 'Never';
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;

Then use: Updated {timeAgoMs(agent.lastActiveMs)}

## Bug 3: Agent names show wrong names (e.g. "Answring Manager" instead of "Maya")
Use the display name map above everywhere agent names are shown on the home page.

## After fixing
1. Build: cd /home/w0lf/mission-control && npm run build
2. Check pm2: pm2 list, then pm2 restart mission-control (or whatever the process name is)
3. The result: BOTH pages must show identical active/idle agents

When completely finished run:
openclaw system event --text "Done: Fixed active agent sync between home and /team pages" --mode now
