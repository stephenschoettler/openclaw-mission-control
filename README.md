# 🎛️ Overwatch

A real-time operations dashboard for [OpenClaw](https://github.com/openclaw/openclaw) AI agent fleets.

Monitor agent activity, manage tasks, review costs, browse session logs, and control your infrastructure — all from one place.

![Overwatch screenshot](screenshots/dashboard.png)

---

## Features

- **Live Dashboard** — agent statuses, recent activity, task board
- **Task Management** — kanban-style task tracking with assignees and priorities
- **Sessions** — browse active and historical agent sessions
- **Costs** — token usage and cost estimates per agent
- **Files** — browse agent workspaces and OpenClaw memory files
- **System** — docker container and systemd service health at a glance
- **Skills** — view registered OpenClaw skills
- **Analytics** — task completion trends over time

---

## Requirements

- **Node.js 18+**
- **OpenClaw gateway** running (default: `http://localhost:3000`)
- SQLite (bundled via `better-sqlite3`)
- Docker (optional — for container monitoring)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yourname/mission-control.git
cd mission-control

# 2. Install
npm install

# 3. Build
npm run build

# 4. Start
npm start
```

Overwatch will be available at **http://localhost:3001**.

---

## Development

```bash
npm run dev
```

---

## Configuration

All settings can be controlled via environment variables or a `.env.local` file in the project root.

| Variable | Default | Description |
|---|---|---|
| `OPENCLAW_GATEWAY_URL` | `http://localhost:3000` | OpenClaw gateway URL |
| `OPENCLAW_DIR` | `~/dev/openclaw` | Path to the openclaw CLI directory |
| `MAIN_AGENT_ALIAS` | `babbage` | Display alias for the `main` agent |
| `MAIN_AGENT_NAME` | `Babbage` | Display name for the main agent |
| `TELEGRAM_TARGET_ID` | _(empty)_ | Telegram chat ID for notifications |
| `DOCKER_CONTAINERS` | _(auto-discover)_ | Comma-separated list of Docker containers to monitor. If empty, all running containers are shown |
| `SYSTEMD_SERVICES` | `openclaw-gateway,mission-control` | Comma-separated systemd user services to monitor |
| `FILE_BROWSER_ROOTS` | _(auto-discover)_ | Comma-separated paths to show in the Files browser. Defaults to all `~/.openclaw/workspace-*` dirs |
| `SUB_AGENT_IDS` | _(empty)_ | Comma-separated agent IDs to hide when idle |

### Example `.env.local`

```env
OPENCLAW_GATEWAY_URL=http://localhost:3000
MAIN_AGENT_ALIAS=babbage
MAIN_AGENT_NAME=Babbage
TELEGRAM_TARGET_ID=123456789
DOCKER_CONTAINERS=my-api,my-nginx,my-db
SYSTEMD_SERVICES=openclaw-gateway,mission-control,my-service
```

---

## Running as a systemd service

```ini
# ~/.config/systemd/user/mission-control.service
[Unit]
Description=Overwatch Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/mission-control
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3001

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now mission-control
```

---

## Architecture

- **Next.js 14** (App Router) — frontend + API routes
- **better-sqlite3** — local SQLite database at `~/.mission-control/mc.db`
- **Tailwind CSS** — styling
- No external database required

---

## License

MIT
