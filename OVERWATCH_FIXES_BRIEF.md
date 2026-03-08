# Overwatch Bug Fix Brief

Fix all P0 and P1 bugs in the Overwatch app at `/home/w0lf/mission-control`.
The app runs on port 3001 (Next.js 14).

---

## P0 Fixes

### 1. Remove Stephen Schoettler from /office NPC view

**File:** `src/app/office/page.tsx`

`agentsWithThoughts` is computed from `filteredAgents` which includes the `_owner` agent.
The owner (human) should NOT appear as a pixel-art NPC.

Fix 1: In the useEffect that initializes filteredAgents (~line 212):
```ts
setFilteredAgents(agents.filter(a => a.id !== '_owner'));
```

Fix 2: Also add filter to agentsWithThoughts (~line 802):
```ts
const agentsWithThoughts = filteredAgents.filter(a => a.id !== '_owner').map(a => ({
```

### 2. Trading cards (/cards) showing wrong names

**File:** `src/app/cards/page.tsx`

Replace the hardcoded `AGENTS` array (currently has "Cipher", "Scout", "Nova", "Pixel") with the real roster:

```ts
const AGENTS = [
  { id: 'babbage',        name: 'Babbage',          emoji: '🦞', role: 'Chief of Staff',          rarity: '◆ LEGENDARY', color: '#f59e0b', level: 99 },
  { id: 'code-monkey',    name: 'Code Monkey',       emoji: '🐒', role: 'Engineering Manager',     rarity: '◆ EPIC',      color: '#a855f7', level: 42 },
  { id: 'answring',       name: 'Maya',              emoji: '📞', role: 'Answring Ops Lead',       rarity: '◆ EPIC',      color: '#3b82f6', level: 35 },
  { id: 'hustle',         name: 'Hustle',            emoji: '💼', role: 'Business Development',    rarity: '● RARE',      color: '#10b981', level: 28 },
  { id: 'roadie',         name: 'Roadie',            emoji: '🎸', role: 'Content & Creative',      rarity: '● RARE',      color: '#f59e0b', level: 22 },
  { id: 'ralph',          name: 'Ralph',             emoji: '✅', role: 'Fleet QA Reviewer',       rarity: '● RARE',      color: '#22c55e', level: 20 },
  { id: 'tldr',           name: 'Cliff',             emoji: '📰', role: 'News & Briefings',        rarity: '● RARE',      color: '#8b5cf6', level: 18 },
  { id: 'forge',          name: 'Forge',             emoji: '⚒️',  role: 'Builder',                rarity: '● RARE',      color: '#f97316', level: 16 },
  { id: 'browser',        name: 'Browser Agent',     emoji: '🌐', role: 'Web Research',            rarity: '◉ UNCOMMON',  color: '#06b6d4', level: 14 },
  { id: 'code-frontend',  name: 'Code Frontend',     emoji: '🎨', role: 'Frontend Engineer',       rarity: '◉ UNCOMMON',  color: '#f97316', level: 12 },
  { id: 'code-backend',   name: 'Code Backend',      emoji: '⚙️',  role: 'Backend Engineer',       rarity: '◉ UNCOMMON',  color: '#f97316', level: 12 },
  { id: 'code-devops',    name: 'Code DevOps',       emoji: '🔧', role: 'DevOps Engineer',         rarity: '◉ UNCOMMON',  color: '#f97316', level: 11 },
  { id: 'docs',           name: 'The Professor',     emoji: '📚', role: 'Documentation',           rarity: '◉ UNCOMMON',  color: '#64748b', level: 10 },
];
```

Also update the card link to use `agent.id`:
```tsx
href={`/card/${agent.id}`}
```

### 3. Trading card images — use emoji avatars as fallback

**File:** `src/app/card/[name]/page.tsx`

- If it tries to load an image file that doesn't exist, use the emoji as avatar instead
- Make the emoji display large (64-80px) as the card's visual avatar
- Add `onError` fallback to any `<img>` tags: show emoji instead

### 4. Analytics double-counting

**File:** `src/app/api/analytics/tasks/route.ts`

After building `assigneeMap`, normalize names before creating the final array:

```ts
const DISPLAY_NAMES: Record<string, string> = {
  'code monkey': 'Code Monkey',
  'code-monkey': 'Code Monkey',
  'babbage': 'Babbage',
  'answring': 'Maya',
  'hustle': 'Hustle',
  'roadie': 'Roadie',
  'ralph': 'Ralph',
  'tldr': 'Cliff',
  'forge': 'Forge',
  'browser agent': 'Browser Agent',
  'browser': 'Browser Agent',
  'code frontend': 'Code Frontend',
  'code-frontend': 'Code Frontend',
  'code backend': 'Code Backend',
  'code-backend': 'Code Backend',
  'code devops': 'Code DevOps',
  'code-devops': 'Code DevOps',
  'docs': 'The Professor',
  'the professor': 'The Professor',
};

// Merge assigneeMap with normalized keys
const normalizedMap: Record<string, number> = {};
for (const [key, count] of Object.entries(assigneeMap)) {
  const lookup = key.toLowerCase().trim();
  const displayName = DISPLAY_NAMES[lookup] || DISPLAY_NAMES[key.replace(/-/g, ' ').toLowerCase().trim()] || key;
  normalizedMap[displayName] = (normalizedMap[displayName] || 0) + count;
}

const byAssignee = Object.entries(normalizedMap)
  .map(([assignee, count]) => ({ assignee, count }))
  .sort((a, b) => b.count - a.count);
```

Replace the existing `byAssignee` sorting with this.

---

## P1 Fixes

### 5. Roadie shows "(wheel)" instead of emoji

**File:** `src/app/team/page.tsx`

The emoji `🎸` (U+1F3B8, GUITAR) may be rendering as "(wheel)" — this is sometimes a Next.js SSR issue or font issue.

Solutions to try in order:
1. Wrap it in a span: `<span aria-hidden="true">🎸</span>`
2. Try a different guitar emoji if `🎸` is problematic
3. Check if there's a `renderEmoji` utility being called that converts it — if so, fix that utility

Search the team page for where `agent.emoji` is rendered and ensure it's just the raw character.

### 6. Remove Comms Agent from /team

**File:** `src/app/team/page.tsx`

Delete this line (around line 48):
```ts
{ id: 'comms', name: 'Comms Agent', emoji: '📱', title: 'Communications & Messaging', tags: ['Telegram', 'Notifications', 'Messaging'], accent: 'red' },
```

### 7. Replace "mission-control" with "overwatch" in /system

**File:** `src/app/system/page.tsx`

- Lines ~130, 185, 186, 189, 230: check where `'mission-control'` is used
- Replace display labels/IDs shown to users with `'overwatch'`
- The systemd/pm2 service name might still need to be `'mission-control'` for restart commands — keep those if the real service is named that, but update any display text

### 8. "Top Contributor" showing raw ID — show display name

**File:** `src/app/analytics/page.tsx`

After fix #4, this should be fixed automatically since `byAssignee[0].assignee` will now be a display name.

If not, add a client-side display name lookup:
```ts
const DISPLAY_NAMES: Record<string, string> = {
  'code-monkey': 'Code Monkey',
  // ... add others
};
value={DISPLAY_NAMES[data.byAssignee[0]?.assignee] ?? data.byAssignee[0]?.assignee ?? '—'}
```

---

## Build & Restart

After all fixes:
1. `cd /home/w0lf/mission-control && npm run build`
2. Check the service: `systemctl --user status overwatch 2>/dev/null || pm2 status 2>/dev/null`
3. Restart appropriately
4. Verify: `curl -s http://localhost:3001/ | grep -i "overwatch\|title" | head -3`

When completely done, run:
```
openclaw system event --text "Done: Overwatch P0+P1 fixes complete" --mode now
```
