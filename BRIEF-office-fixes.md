# Office Page Fixes — Round 2

Project: `/home/w0lf/mission-control`
Dev server runs on port 3001.

## Issues to Fix

---

### 1. Loading Stuck on Re-Visit (CRITICAL)

**File:** `src/app/office/page.tsx`

Root cause: `moduleInitialLoaded` is a **module-level variable** (declared outside the component).
It persists across React component unmounts. When user navigates away and comes back,
component remounts but flag is still `true`, so initial data load useEffect skips entirely,
`isInitialLoading` stays `true` forever → loading screen never goes away.

**Fix:** Replace module-level flag with `useRef` inside the component:
```ts
// REMOVE this line (it's outside the component):
// let moduleInitialLoaded = false;

// ADD inside component (after other useRef declarations):
const initialLoadedRef = useRef(false);

// In the initial load useEffect, change:
//   if (moduleInitialLoaded) return;
//   moduleInitialLoaded = true;
// To:
//   if (initialLoadedRef.current) return;
//   initialLoadedRef.current = true;
```

---

### 2. Rewrite /api/office GET Route (CRITICAL)

**File:** `src/app/api/office/route.ts`

Current problem:
- Returns a flat array `[{agent_id, agent_name, role, status, ...}]`
- Page expects `{ agents: [...], activityLog: [], chatLog: [], setupCheck: null }`
- Status is stale sqlite data — agents show as "working" when they're not
- Model IDs stored in `role` field (e.g. "anthropic/claude-sonnet-4-6")

**Fix:** Rewrite the GET handler:

```ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/home/w0lf';
const OPENCLAW_JSON = path.join(HOME, '.openclaw', 'openclaw.json');
const AGENTS_DIR = path.join(HOME, '.openclaw', 'agents');

// Short role labels (1-2 words max)
const ROLE_MAP: Record<string, string> = {
  'main': 'Assistant',
  'answring': 'Manager',
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
  'browser': 'Browser',
};

// Team groupings
const TEAM_MAP: Record<string, string> = {
  'answring': 'answring',
  'answring-ops': 'answring',
  'answring-marketing': 'answring',
  'answring-dev': 'answring',
  'answring-strategist': 'answring',
  'answring-sales': 'answring',
  'answring-qa': 'answring',
  'answring-security': 'answring',
  'code-monkey': 'engineering',
  'code-frontend': 'engineering',
  'code-backend': 'engineering',
  'code-devops': 'engineering',
  'code-webdev': 'engineering',
  'ralph': 'engineering',
  'main': 'specialists',
  'tldr': 'specialists',
  'roadie': 'specialists',
  'hustle': 'specialists',
  'forge': 'specialists',
  'docs': 'specialists',
  'browser': 'specialists',
};

function hasActiveSession(agentId: string): boolean {
  const sessionsDir = path.join(AGENTS_DIR, agentId, 'sessions');
  try {
    const files = fs.readdirSync(sessionsDir);
    return files.some(f => f.endsWith('.lock'));
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const agentList: any[] = config?.agents?.list || [];

    const agents = agentList
      .filter((a: any) => a.id && a.id !== 'defaults')
      .map((a: any) => {
        const id = a.id;
        const isActive = hasActiveSession(id);
        return {
          id,
          name: a.name || id,
          status: isActive ? 'working' : 'idle',
          role: ROLE_MAP[id] || (a.name || id).split(' ').slice(-1)[0],
          task: null,
          color: null,
          mood: 'good',
          skills: [],
          xp: 0,
          level: 1,
          team: TEAM_MAP[id] || 'specialists',
        };
      });

    return NextResponse.json({
      agents,
      activityLog: [],
      chatLog: [],
      setupCheck: null,
    });
  } catch (err) {
    console.error('Office API error:', err);
    return NextResponse.json({ agents: [], activityLog: [], chatLog: [], setupCheck: null });
  }
}

// Keep POST and PATCH for compatibility but they write to sqlite (legacy)
export async function POST(req: NextRequest) { ... keep existing ... }
export async function PATCH(req: NextRequest) { ... keep existing ... }
```

---

### 3. Team Grouping in Office Layout

**File:** `src/app/office/page.tsx`

In both Work Room and Lounge, group NPCs by their `team` field and add small team labels.

Add a helper function:
```ts
function groupByTeam(agents: Agent[]): Record<string, Agent[]> {
  const groups: Record<string, Agent[]> = {};
  for (const a of agents) {
    const team = (a as any).team || 'specialists';
    if (!groups[team]) groups[team] = [];
    groups[team].push(a);
  }
  return groups;
}

const TEAM_META: Record<string, { icon: string; label: string; color: string }> = {
  answring: { icon: '🏢', label: 'Answring', color: '#f59e0b' },
  engineering: { icon: '⚙️', label: 'Engineering', color: '#6366f1' },
  specialists: { icon: '⭐', label: 'Specialists', color: '#a855f7' },
};
```

In the Work Room render section, replace the flat `working.map(...)` with:
```tsx
{Object.entries(groupByTeam(working)).map(([team, teamAgents]) => {
  const meta = TEAM_META[team] || TEAM_META.specialists;
  return (
    <div key={team} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        fontSize: 7, fontFamily: '"Press Start 2P", monospace',
        color: meta.color, opacity: 0.7, letterSpacing: 1,
        borderBottom: `1px solid ${meta.color}44`,
        paddingBottom: 3, width: '100%', textAlign: 'center',
      }}>
        {meta.icon} {meta.label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
        {teamAgents.map((a, idx) => ( ... existing NPC render ... ))}
      </div>
    </div>
  );
})}
```

Do the same for the Lounge (idle agents).

---

## After All Fixes

Build and restart:
```bash
cd /home/w0lf/mission-control
npm run build 2>&1 | tail -20
pm2 restart mission-control
```

Then notify:
```bash
openclaw system event --text "Office fixes done: loading fixed, live session status, team grouping" --mode now
```
