# Mission Control — Build Brief

## Overview
Build a NextJS 14 (App Router) "Mission Control" dashboard for an OpenClaw AI agent fleet.
This is a personal ops dashboard running locally on port 3001.

## Tech Stack
- **NextJS 14** with App Router (`npx create-next-app@14 . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"`)
- **better-sqlite3** for persisting tasks and content pipeline items
- **Tailwind CSS** (dark theme, already included)
- **Lucide React** for icons
- **No auth required** (local/Tailscale only)

## Design System — Dark Theme
Match this CSS variable palette exactly:
```
--bg: #0a0a0f
--surface: rgba(255,255,255,0.03)
--border: rgba(255,255,255,0.06)
--accent: #6366f1 (indigo)
--accent2: #9333ea (purple)
--green: #4ade80
--yellow: #facc15
--red: #f87171
--orange: #fb923c
--text: #e5e5e5
--textStrong: #ffffff
--muted: #737373
```
Font: `-apple-system, BlinkMacSystemFont, 'SF Pro', 'Helvetica Neue', sans-serif`
Use glassmorphism cards: `bg-white/[0.03] border border-white/[0.06] rounded-xl`

## Panels to Build (sidebar nav tabs)

### 1. Tasks Board (`/tasks`)
- Kanban columns: Backlog | In Progress | Done
- Task fields: title, description, assignee (me | Babbage | Hustle | Code Monkey | Roadie | TLDR | Answring Ops), priority (low|medium|high|urgent), status
- CRUD: add, edit, drag between columns (use @hello-pangea/dnd or simple click-to-move buttons), delete
- Persist in SQLite (`~/.mission-control/db.sqlite`)
- Empty state: helpful placeholder text

### 2. Calendar (`/calendar`)
- Monthly calendar grid (current month, prev/next nav)
- Read OpenClaw cron jobs from `/home/w0lf/.openclaw/openclaw.json` (path: `crons` array, each has `id`, `schedule` (cron expr), `name`/`label`, `agent`, `enabled`)
- Display cron events on their next scheduled occurrence date
- Also show manual events (add via form: title, date, time, notes) — persist in SQLite
- Color-code: crons in indigo, manual events in green

### 3. Memory (`/memory`)
- List all markdown files from `/home/w0lf/.openclaw/workspace/memory/` sorted newest-first
- Show filename, first 3 lines as preview, file size
- Click to open — render full markdown in a side panel (use `react-markdown`)
- Search bar: client-side filter on filename + content preview
- Also include files from `/home/w0lf/.openclaw/workspace/MEMORY.md` (pinned at top)

### 4. Team (`/team`)
- Read agents from `/home/w0lf/.openclaw/openclaw.json` (path: `agents.list[]`)
- Show each agent as a card: name, model, workspace path, id
- Agent avatars: colored initials circle (indigo gradient)
- Status badge: show "Active" (green) for all (can't know real-time status)
- Include a "Fleet Stats" header: total agents, models breakdown

### 5. Content Pipeline (`/content`)
- Kanban: Idea | Scripted | Thumbnail | Filming | Published
- Item fields: title, notes, script (textarea), thumbnail URL
- CRUD + drag between stages (or click buttons)
- Persist in SQLite

### 6. Office (`/office`)
- Grid of agent "workstations" — each agent gets a card with:
  - Avatar (colored initials, animated pulse if "active")
  - Name + role
  - Current task (manual text field, editable inline)
  - Status: Working | Idle | Offline (click to cycle)
- Fun retro-office aesthetic: desk emoji 🖥️, subtle grid background
- Persist status + current task in SQLite

## File Structure
```
~/mission-control/
  src/
    app/
      layout.tsx         -- root layout with sidebar nav
      page.tsx           -- redirect to /tasks
      tasks/page.tsx
      calendar/page.tsx
      memory/page.tsx
      team/page.tsx
      content/page.tsx
      office/page.tsx
    api/
      tasks/route.ts     -- GET/POST/PATCH/DELETE
      events/route.ts    -- calendar events
      content/route.ts
      office/route.ts
      crons/route.ts     -- reads openclaw.json
      agents/route.ts    -- reads openclaw.json
      memory/route.ts    -- lists/reads memory files
    lib/
      db.ts              -- SQLite setup (better-sqlite3)
  next.config.js         -- port 3001 in package.json scripts
  package.json
```

## SQLite DB Location
Store at `/home/w0lf/.mission-control/db.sqlite` (create dir if needed).
Initialize tables on first run in `lib/db.ts`.

## Port
Run on port 3001. Set in `package.json`:
```json
"dev": "next dev -p 3001",
"start": "next start -p 3001"
```

## Systemd User Service
Create `/home/w0lf/.config/systemd/user/mission-control.service`:
```ini
[Unit]
Description=Mission Control Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/w0lf/mission-control
ExecStart=/usr/bin/node_modules/.bin/next start -p 3001
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=/home/w0lf/.npm-packages/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
```
Also create a build script at `~/mission-control/build-and-start.sh` with `npm run build && npm start`.

## Sidebar Navigation
Left sidebar (fixed, 220px wide):
- Logo: "⚡ Mission Control" in gradient text
- Nav items with icons (lucide): Tasks (CheckSquare), Calendar (CalendarDays), Memory (Brain), Team (Users), Content (Film), Office (Building2)
- Active state: indigo left border + slight background
- Bottom: hostname + "Babbage Fleet" label

## Notes
- No external API calls — all data is local files or SQLite
- All API routes read files server-side (not client-side fetch of local paths)
- The openclaw.json path is `/home/w0lf/.openclaw/openclaw.json`
- Memory files path: `/home/w0lf/.openclaw/workspace/memory/`
- Use `fs` module in API routes to read local files
- Handle missing files gracefully (return empty arrays)

## When Done
After building, run:
```bash
cd ~/mission-control && npm install && npm run build
```
Then notify:
```bash
~/.npm-packages/bin/openclaw system event --text "Done: Mission Control built at ~/mission-control — port 3001. Run: npm start" --mode now
```
