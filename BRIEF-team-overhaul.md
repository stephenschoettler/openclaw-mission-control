# /team Page Overhaul

Project: `/home/w0lf/mission-control`
Dev server: port 3001

## Goal
Replace the current /team page with a proper command center. Three changes:
1. New agent hierarchy (3 groups)
2. Live status from OpenClaw session files (no sqlite)
3. Click-to-inspect drawer

---

## Step 1: New API Route — `/api/agent-status`

**File:** `src/app/api/agent-status/route.ts`

This API reads real OpenClaw state. No sqlite. No self-reported status.

```ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/home/w0lf';
const OPENCLAW_JSON = path.join(HOME, '.openclaw', 'openclaw.json');
const AGENTS_DIR = path.join(HOME, '.openclaw', 'agents');

// Map agent IDs to their on-disk directory names (some differ)
const AGENT_DIR_MAP: Record<string, string> = {
  'code-monkey': 'dev',
  'main': 'main',
  'answring': 'answring',
  'tldr': 'tldr',
  'roadie': 'roadie',
  'hustle': 'hustle',
  'forge': 'forge',
  'docs': 'docs',
  'ralph': 'ralph',
  'browser': 'browser',
  'answring-ops': 'answring-ops',
  'answring-marketing': 'answring-marketing',
  'answring-dev': 'answring-dev',
  'answring-security': 'answring-security',
  'answring-strategist': 'answring-strategist',
  'answring-sales': 'answring-sales',
  'answring-qa': 'answring-qa',
};

// Short role labels
const ROLE_MAP: Record<string, string> = {
  'main': 'Chief of Staff',
  'answring': 'Answring Lead',
  'answring-ops': 'Ops',
  'answring-marketing': 'Marketing',
  'answring-dev': 'Dev',
  'answring-strategist': 'Strategist',
  'answring-sales': 'Sales',
  'answring-qa': 'QA',
  'answring-security': 'Security',
  'tldr': 'Digest',
  'roadie': 'Roadie',
  'hustle': 'Growth',
  'code-monkey': 'Eng Manager',
  'code-frontend': 'Frontend',
  'code-backend': 'Backend',
  'code-devops': 'DevOps',
  'code-webdev': 'WebDev',
  'ralph': 'QA Lead',
  'forge': 'Builder',
  'docs': 'Professor',
  'browser': 'Crawler',
};

// Read sessions.json to find the most recently active session
function getSessionStatus(agentId: string): { isWorking: boolean; lastActiveMs: number; sessionId?: string } {
  const dirName = AGENT_DIR_MAP[agentId] || agentId;
  const sessionsJsonPath = path.join(AGENTS_DIR, dirName, 'sessions', 'sessions.json');
  const WORKING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  try {
    const raw = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8'));
    let latestMs = 0;
    let latestSessionId = '';

    for (const [key, val] of Object.entries(raw as Record<string, any>)) {
      if (key.includes(':watercooler')) continue; // skip watercooler
      const updatedAt = val?.updatedAt || 0;
      if (updatedAt > latestMs) {
        latestMs = updatedAt;
        latestSessionId = val?.sessionId || '';
      }
    }

    if (latestMs > 0 && (now - latestMs) < WORKING_THRESHOLD_MS) {
      return { isWorking: true, lastActiveMs: latestMs, sessionId: latestSessionId };
    }
    return { isWorking: false, lastActiveMs: latestMs, sessionId: latestSessionId };
  } catch {
    return { isWorking: false, lastActiveMs: 0 };
  }
}

// Read last few lines of a session JSONL to get last task
function getLastTask(agentId: string, sessionId: string): string {
  const dirName = AGENT_DIR_MAP[agentId] || agentId;
  const filePath = path.join(AGENTS_DIR, dirName, 'sessions', `${sessionId}.jsonl`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim()).slice(-30);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const msg = entry.type === 'message' ? entry.message : entry;
        if (msg?.role === 'assistant' && Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text?.length > 10) {
              const t = part.text.split('\n').find((l: string) => 
                l.trim().length > 10 && !l.startsWith('#') && !l.startsWith('---')
              );
              if (t) return t.slice(0, 120);
            }
          }
        }
      } catch {}
    }
  } catch {}
  return '';
}

// Get workspace path for agent
function getWorkspacePath(agentId: string): string {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const agent = (config.agents?.list || []).find((a: any) => a.id === agentId);
    return agent?.workspace || '';
  } catch {
    return '';
  }
}

// Get model for agent
function getAgentModel(agentId: string): string {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const agent = (config.agents?.list || []).find((a: any) => a.id === agentId);
    return agent?.model?.primary || config.agents?.defaults?.model?.primary || '';
  } catch {
    return '';
  }
}

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const agentList: any[] = (config.agents?.list || []).filter((a: any) => a.id && a.id !== 'defaults');

    const agents = agentList.map((a: any) => {
      const id = a.id;
      const sessionStatus = getSessionStatus(id);
      const lastTask = sessionStatus.isWorking && sessionStatus.sessionId
        ? getLastTask(id, sessionStatus.sessionId)
        : '';

      return {
        id,
        name: a.name || id,
        role: ROLE_MAP[id] || 'Agent',
        status: sessionStatus.isWorking ? 'working' : 'idle',
        lastActiveMs: sessionStatus.lastActiveMs,
        lastTask: lastTask || null,
        workspace: a.workspace || '',
        model: a.model?.primary || config.agents?.defaults?.model?.primary || '',
        sessionId: sessionStatus.sessionId || null,
      };
    });

    return NextResponse.json(agents);
  } catch (err) {
    console.error('agent-status error:', err);
    return NextResponse.json([]);
  }
}
```

---

## Step 2: Rewrite `/team` Page

**File:** `src/app/team/page.tsx`

Complete rewrite. Keep the same dark aesthetic and tailwind classes from the current file.

### Layout (top to bottom):

```
Header: "Agent Fleet" + live count badge + last-refresh time

📞 ANSWRING TEAM
  [Maya — Team Lead] [Sal] [Quinn] [Stella] [Opie] [Devin] [Marcus] [Cera]

💻 ENGINEERING TEAM  
  [Code Monkey — Eng Manager] [Frontend] [Backend] [DevOps] [WebDev] [Ralph]

🔧 SPECIALISTS
  [Babbage] [Cliff] [Crawler] [Forge] [Hustle] [Roadie] [The Professor]
```

### Agent roster (HARDCODE these — source of truth):

```ts
// Answring team
{ id: 'answring',           name: 'Maya',       role: 'Team Lead',    emoji: '📞', isLead: true  }
{ id: 'answring-sales',     name: 'Sal',         role: 'Sales',        emoji: '💰' }
{ id: 'answring-qa',        name: 'Quinn',       role: 'QA',           emoji: '🔍' }
{ id: 'answring-strategist',name: 'Stella',      role: 'Strategy',     emoji: '🧠' }
{ id: 'answring-ops',       name: 'Opie',        role: 'Ops',          emoji: '📊' }
{ id: 'answring-dev',       name: 'Devin',       role: 'Dev',          emoji: '💻' }
{ id: 'answring-marketing', name: 'Marcus',      role: 'Marketing',    emoji: '📣' }
{ id: 'answring-security',  name: 'Cera',        role: 'Security',     emoji: '🔒' }

// Engineering team
{ id: 'code-monkey',   name: 'Code Monkey', role: 'Eng Manager',  emoji: '🐒', isLead: true }
{ id: 'code-frontend', name: 'Frontend',    role: 'Frontend',     emoji: '🎨' }
{ id: 'code-backend',  name: 'Backend',     role: 'Backend',      emoji: '⚙️'  }
{ id: 'code-devops',   name: 'DevOps',      role: 'DevOps',       emoji: '🔧' }
{ id: 'code-webdev',   name: 'WebDev',      role: 'WebDev',       emoji: '🖥️'  }
{ id: 'ralph',         name: 'Ralph',       role: 'QA Lead',      emoji: '✅' }

// Specialists
{ id: 'main',    name: 'Babbage',       role: 'Chief of Staff', emoji: '🤖' }
{ id: 'tldr',    name: 'Cliff',         role: 'Digest',         emoji: '📰' }
{ id: 'browser', name: 'Crawler',       role: 'Web Research',   emoji: '🌐' }
{ id: 'forge',   name: 'Forge',         role: 'Builder',        emoji: '🔨' }
{ id: 'hustle',  name: 'Hustle',        role: 'Growth',         emoji: '💼' }
{ id: 'roadie',  name: 'Roadie',        role: 'Logistics',      emoji: '🎸' }
{ id: 'docs',    name: 'The Professor', role: 'Docs & Research',emoji: '📚' }
```

### Card design:

Each agent card shows:
- Emoji + Name + Role
- Green "LIVE" badge if working, yellow dot if idle
- If working: truncated last task (from API)
- **Clickable** — clicking opens an inspect panel

**Lead cards** (Maya, Code Monkey) are slightly larger/wider than regular cards.

### Click-to-inspect panel (slide-in or modal):

When you click a card, show a panel with:
```
[Emoji] Name
Role | Status badge
────────────────
Last Active: "2 mins ago" (or "Just now")
Workspace:   /home/w0lf/.openclaw/workspace-answring
Model:       anthropic/claude-sonnet-4-6
Session:     abc123...
Last Task:   "Reviewing PR for route fixes..."  (if available)
────────────────
[Close ✕]
```

### Status polling:

- Fetch `/api/agent-status` on mount
- Poll every 15 seconds
- Show "Updated Xs ago" in the header
- **Fix the re-mount loading bug**: use `useRef` instead of any module-level flag (same fix as office page)

### Avoid retired agents:
Do NOT include: Comms Agent, any agent not in the roster above.

---

## Step 3: Verify /office loading fix

The /office loading fix (moduleInitialLoaded → useRef) should already be in place.
Check `src/app/office/page.tsx` — look for `initialLoadedRef` and confirm it's a `useRef`.
If it's still `let moduleInitialLoaded = false` at module level, fix it.

---

## Build & Restart

```bash
cd /home/w0lf/mission-control
npm run build 2>&1 | tail -20
kill $(pgrep -f "next-server") 2>/dev/null; sleep 1
nohup node node_modules/.bin/next start -p 3001 > /tmp/mc.log 2>&1 &
sleep 4
curl -s http://localhost:3001/api/agent-status | python3 -c "
import json,sys
d=json.load(sys.stdin)
for a in d:
    print(a['id'], '→', a['status'], '|', a['name'])
"
```

Then notify:
```bash
openclaw system event --text "/team overhaul done: 3 groups, live session status, click-to-inspect" --mode now
```
