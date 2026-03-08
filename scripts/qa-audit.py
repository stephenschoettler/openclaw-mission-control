#!/usr/bin/env python3
"""
QA Audit Script — OpenClaw Cron
Detects when dev agents complete tasks without Ralph QA review.
Outputs JSON report. Exit 0 always (violations encoded in output).
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

AGENTS_DIR = Path.home() / ".openclaw" / "agents"
DEV_AGENTS = ["code-monkey", "code-frontend", "code-backend", "code-devops", "code-webdev"]
RALPH_AGENT = "ralph"
WINDOW_MINUTES = 30


def now_ms() -> int:
    return int(time.time() * 1000)


def within_window(updated_at_ms: int, window_ms: int) -> bool:
    return (now_ms() - updated_at_ms) <= window_ms


def get_first_user_message(session_id: str, agent: str) -> Optional[str]:
    """Extract first user message from session JSONL to get task description."""
    jsonl_path = AGENTS_DIR / agent / "sessions" / f"{session_id}.jsonl"
    if not jsonl_path.exists():
        return None
    try:
        with open(jsonl_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                    if d.get("type") == "message":
                        msg = d.get("message", {})
                        if msg.get("role") == "user":
                            content = msg.get("content", [])
                            if isinstance(content, list):
                                for c in content:
                                    if isinstance(c, dict) and c.get("type") == "text":
                                        text = c["text"]
                                        lines = text.strip().splitlines()
                                        for i, ln in enumerate(lines):
                                            if "[Subagent Task]:" in ln:
                                                task_start = ln.split("[Subagent Task]:", 1)[-1].strip()
                                                if task_start:
                                                    return task_start[:200]
                                                if i + 1 < len(lines):
                                                    return lines[i + 1].strip()[:200]
                                        return lines[0][:200] if lines else None
                            elif isinstance(content, str):
                                return content[:200]
                            return None
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass
    return None


def load_sessions(agent: str) -> dict:
    sessions_path = AGENTS_DIR / agent / "sessions" / "sessions.json"
    if not sessions_path.exists():
        return {}
    try:
        with open(sessions_path, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def ms_to_iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    window_ms = WINDOW_MINUTES * 60 * 1000

    # Check Ralph activity in window
    ralph_sessions = load_sessions(RALPH_AGENT)
    ralph_active = any(
        within_window(s.get("updatedAt", 0), window_ms)
        for s in ralph_sessions.values()
        if isinstance(s, dict)
    )

    violations = []

    for agent in DEV_AGENTS:
        sessions = load_sessions(agent)
        for session_key, session in sessions.items():
            if not isinstance(session, dict):
                continue
            # Only subagent sessions (depth >= 1)
            spawn_depth = session.get("spawnDepth", 0)
            if spawn_depth < 1:
                continue
            updated_at = session.get("updatedAt", 0)
            if not within_window(updated_at, window_ms):
                continue

            session_id = session.get("sessionId", "")
            task = get_first_user_message(session_id, agent) if session_id else None
            if not task:
                task = f"(session {session_id[:8]}...)" if session_id else "(unknown task)"

            violations.append({
                "agent": agent,
                "sessionKey": session_key,
                "task": task,
                "completedAt": ms_to_iso(updated_at),
                "updatedAtMs": updated_at,
            })

    # Sort violations by completedAt desc
    violations.sort(key=lambda x: x["updatedAtMs"], reverse=True)

    result = {
        "violations": [
            {k: v for k, v in vio.items() if k != "updatedAtMs"}
            for vio in violations
        ],
        "ralph_active": ralph_active,
        "windowMinutes": WINDOW_MINUTES,
        "checkedAt": ms_to_iso(now_ms()),
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
