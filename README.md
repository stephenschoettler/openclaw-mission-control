# ⚡ OpenClaw Mission Control

A Mission Control dashboard for [OpenClaw](https://openclaw.ai) agent fleets. Inspired by [@AlexFinn's article](https://x.com/AlexFinn/status/2024169334344679783).

> Built in an afternoon by delegating to the agent fleet itself.

## Panels

| Panel | Description |
|-------|-------------|
| 🗂️ **Tasks Board** | Kanban board (Backlog / In Progress / Done) shared between you and your agents |
| 📅 **Calendar** | Monthly view of OpenClaw cron jobs + manual events |
| 🧠 **Memory** | Browse and search all agent memory files with markdown preview |
| 👥 **Team** | Live agent roster pulled from your OpenClaw config — names, models, workspaces |
| 🎬 **Content Pipeline** | 5-stage kanban for content creation (Idea → Scripted → Thumbnail → Filming → Published) |
| 🏢 **Office** | Agent workstations with live status and current task |

## Stack

- **NextJS 14** (App Router)
- **Tailwind CSS** (dark theme)
- **SQLite** via `better-sqlite3` — no SaaS, no Convex account needed
- **Lucide React** icons

## Setup

```bash
git clone https://github.com/stephenschoettler/openclaw-mission-control
cd openclaw-mission-control
npm install
npm run build
npm start -- -p 3001
```

Runs at `http://localhost:3001`.

## OpenClaw Integration

The dashboard reads directly from your OpenClaw config:

- **Agents** → `~/.openclaw/openclaw.json` (`agents.list`)
- **Crons** → `~/.openclaw/openclaw.json` (`crons`)
- **Memory files** → `~/.openclaw/workspace/memory/*.md`

Persistent data (tasks, events, content, office status) is stored at `~/.mission-control/db.sqlite`.

## Systemd Service (optional)

```bash
systemctl --user enable --now mission-control
```

Service file is at `~/.config/systemd/user/mission-control.service` after first run.

## Inspired By

[@AlexFinn](https://x.com/AlexFinn) — [Your OpenClaw is useless without a Mission Control](https://x.com/AlexFinn/status/2024169334344679783)
