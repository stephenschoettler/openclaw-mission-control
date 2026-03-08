#!/usr/bin/env python3
"""Overwatch test suite for Mission Control."""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BASE_URL = "http://localhost:3001"
HOME = os.path.expanduser("~")
GATEWAY_URL = "http://127.0.0.1:18789/tools/invoke"

checks = []
passed = 0
failed = 0


def record(name, status, detail=None):
    global passed, failed
    entry = {"name": name, "status": status}
    if detail:
        entry["detail"] = detail
    checks.append(entry)
    if status == "pass":
        passed += 1
    elif status == "fail":
        failed += 1


def fetch(path, timeout=10):
    url = BASE_URL + path
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def get_gateway_token():
    try:
        cfg_path = os.path.join(HOME, ".openclaw", "openclaw.json")
        with open(cfg_path) as f:
            cfg = json.load(f)
        return cfg.get("gateway", {}).get("auth", {}).get("token", "")
    except Exception:
        return ""


def fetch_gateway_sessions():
    """Fetch live sessions directly from gateway API."""
    try:
        token = get_gateway_token()
        data = json.dumps({"tool": "sessions_list", "args": {"activeMinutes": 60, "limit": 30}}).encode("utf-8")
        req = urllib.request.Request(
            GATEWAY_URL, data=data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read())
        return body.get("result", {}).get("details", {}).get("sessions", [])
    except Exception:
        return None


# ── 1. Build health ──────────────────────────────────────────────────────────

try:
    build_id_path = os.path.join(HOME, "mission-control", ".next", "BUILD_ID")
    if os.path.exists(build_id_path):
        record("build_health/BUILD_ID", "pass")
    else:
        record("build_health/BUILD_ID", "fail", f"File not found: {build_id_path}")
except Exception as e:
    record("build_health/BUILD_ID", "fail", str(e))

try:
    code, _ = fetch("/")
    if code == 200:
        record("build_health/service_responding", "pass")
    else:
        record("build_health/service_responding", "fail", f"HTTP {code}")
except Exception as e:
    record("build_health/service_responding", "fail", str(e))


# ── 2. API health ────────────────────────────────────────────────────────────

def check_api(path, name, validator):
    try:
        code, body = fetch(path)
        if code != 200:
            record(name, "fail", f"HTTP {code}")
            return None
        data = json.loads(body)
        ok, detail = validator(data)
        record(name, "pass" if ok else "fail", detail if not ok else None)
        return data
    except Exception as e:
        record(name, "fail", str(e))
        return None


office_data = check_api(
    "/api/office", "api/office",
    lambda d: (isinstance(d, dict) and "agents" in d and isinstance(d["agents"], list),
               "Missing 'agents' list key")
)

tasks_data = check_api("/api/tasks", "api/tasks",
                       lambda d: (isinstance(d, list), "Expected JSON array"))

check_api("/api/activity", "api/activity",
          lambda d: (isinstance(d, list), "Expected JSON array"))

check_api("/api/activity/live", "api/activity/live",
          lambda d: (isinstance(d, list), "Expected JSON array"))

# /api/agents/main/feed returns {"feed": [...]}
check_api("/api/agents/main/feed", "api/agents/main/feed",
          lambda d: (
              (isinstance(d, list)) or
              (isinstance(d, dict) and "feed" in d and isinstance(d["feed"], list)),
              "Expected JSON array or object with 'feed' list"
          ))

check_api("/api/gateway", "api/gateway",
          lambda d: (isinstance(d, dict), "Expected JSON object"))

check_api("/api/costs", "api/costs",
          lambda d: (isinstance(d, (dict, list)), "Expected JSON object or array"))


# ── 3. Gateway reachability ──────────────────────────────────────────────────

try:
    gw_sessions = fetch_gateway_sessions()
    if gw_sessions is not None:
        record("gateway/sessions_list_reachable", "pass",
               f"Got {len(gw_sessions)} sessions")
    else:
        record("gateway/sessions_list_reachable", "fail",
               "Could not reach gateway sessions_list")
except Exception as e:
    record("gateway/sessions_list_reachable", "fail", str(e))


# ── 4. Page loads ────────────────────────────────────────────────────────────

pages = [
    ("/", "pages/home", ["Overview", "Command Center"]),
    ("/team", "pages/team", ["Team", "Specialists"]),
    ("/tasks", "pages/tasks", ["Tasks"]),
    ("/activity", "pages/activity", ["Activity"]),
]

for path, name, keywords in pages:
    try:
        code, body = fetch(path)
        if code != 200:
            record(name, "fail", f"HTTP {code}")
            continue
        text = body.decode("utf-8", errors="replace")
        if any(kw in text for kw in keywords):
            record(name, "pass")
        else:
            record(name, "fail", f"None of {keywords} found in response")
    except Exception as e:
        record(name, "fail", str(e))


# ── 5. Agent roster ──────────────────────────────────────────────────────────

try:
    openclaw_cfg = os.path.join(HOME, ".openclaw", "openclaw.json")
    with open(openclaw_cfg) as f:
        cfg = json.load(f)

    openclaw_ids = set()
    for agent in cfg.get("agents", {}).get("list", []):
        aid = agent.get("id")
        if aid:
            openclaw_ids.add(aid)

    office_ids = set()
    if office_data and "agents" in office_data:
        for agent in office_data["agents"]:
            aid = agent.get("id")
            if aid:
                office_ids.add(aid)

    missing = openclaw_ids - office_ids
    if missing:
        record("roster/agent_coverage", "warn",
               f"Agents in openclaw.json not in /api/office: {sorted(missing)}")
    else:
        record("roster/agent_coverage", "pass")
except Exception as e:
    record("roster/agent_coverage", "fail", str(e))


# ── 6. Data consistency — verify working agents against gateway ──────────────

try:
    if office_data and "agents" in office_data:
        working_agents = [a for a in office_data["agents"] if a.get("status") == "working"]

        if working_agents and gw_sessions is not None:
            now_ms = datetime.now(timezone.utc).timestamp() * 1000
            five_min_ms = 5 * 60 * 1000

            # Build set of active agent IDs from gateway
            gw_active_ids = set()
            for sess in gw_sessions:
                key = sess.get("key", "")
                if ":cron:" in key or ":watercooler" in key:
                    continue
                updated = sess.get("updatedAt", 0)
                if (now_ms - updated) < five_min_ms:
                    parts = key.split(":")
                    if len(parts) >= 2 and parts[0] == "agent":
                        gw_active_ids.add(parts[1])

            for agent in working_agents:
                aid = agent.get("id", "unknown")
                check_name = f"consistency/working_verified/{aid}"
                if aid in gw_active_ids:
                    record(check_name, "pass")
                else:
                    record(check_name, "warn",
                           f"Agent {aid} shows as working but not found in gateway active sessions")

        elif not working_agents:
            record("consistency/working_agents", "pass", "No agents with status=working")
        else:
            record("consistency/working_agents", "warn", "Gateway unreachable, cannot verify")
except Exception as e:
    record("consistency/working_agents", "fail", str(e))


# ── 7. Stale tasks ───────────────────────────────────────────────────────────

try:
    if tasks_data is not None:
        tasks = tasks_data
    else:
        code, body = fetch("/api/tasks")
        tasks = json.loads(body) if code == 200 else []

    now = datetime.now(timezone.utc)
    stale_threshold = timedelta(minutes=30)

    stale = []
    for task in tasks:
        if task.get("status") == "in-progress":
            updated_raw = task.get("updated_at") or task.get("updatedAt", "")
            if updated_raw:
                try:
                    if isinstance(updated_raw, (int, float)):
                        updated = datetime.fromtimestamp(updated_raw / 1000, tz=timezone.utc)
                    else:
                        updated = datetime.fromisoformat(str(updated_raw).rstrip("Z")).replace(tzinfo=timezone.utc)
                    age = now - updated
                    if age > stale_threshold:
                        stale.append({
                            "id": task.get("id", "?"),
                            "title": task.get("title", "?"),
                            "age_min": int(age.total_seconds() // 60)
                        })
                except Exception:
                    pass

    if stale:
        record("stale_tasks/check", "warn",
               f"{len(stale)} stale in-progress task(s): {stale}")
    else:
        record("stale_tasks/check", "pass")
except Exception as e:
    record("stale_tasks/check", "fail", str(e))


# ── 8. UX quality checks ──────────────────────────────────────────────────────

PLACEHOLDER_TITLES = {"subagent task", "unknown", ""}

# 8a. No placeholder titles in tasks
try:
    _, body = fetch("/api/tasks")
    tasks = json.loads(body)
    bad = [t.get("title", "") for t in tasks
           if t.get("title", "").strip().lower() in PLACEHOLDER_TITLES
           or len(t.get("title", "").strip()) < 5]
    if bad:
        record("ux/no_placeholder_titles", "fail", f"Bad titles: {bad[:5]}")
    else:
        record("ux/no_placeholder_titles", "pass")
except Exception as e:
    record("ux/no_placeholder_titles", "fail", str(e))

# 8b. Activity feed — verify gateway live endpoint returns data when agents are working
try:
    _, office_body = fetch("/api/office")
    office = json.loads(office_body)
    working = [a["id"] for a in office.get("agents", []) if a.get("status") == "working"]

    if working:
        _, live_body = fetch("/api/activity/live")
        live_sessions = json.loads(live_body)
        if len(live_sessions) > 0:
            record("ux/live_sessions_consistent", "pass",
                   f"{len(live_sessions)} live sessions while {len(working)} agents working")
        else:
            record("ux/live_sessions_consistent", "warn",
                   f"Agents working ({working}) but /api/activity/live returned 0 sessions")
    else:
        record("ux/live_sessions_consistent", "pass")
except Exception as e:
    record("ux/live_sessions_consistent", "fail", str(e))

# 8c. Timestamps not null
try:
    null_ts = []
    for endpoint in ["/api/tasks", "/api/activity"]:
        _, body = fetch(endpoint)
        items = json.loads(body)
        for item in items:
            for field in ("created_at", "updated_at"):
                if field in item and item[field] is None:
                    null_ts.append(f"{endpoint}[{item.get('id','?')}].{field}")
    if null_ts:
        record("ux/timestamps_not_null", "fail", f"Null timestamps: {null_ts[:5]}")
    else:
        record("ux/timestamps_not_null", "pass")
except Exception as e:
    record("ux/timestamps_not_null", "fail", str(e))

# 8d. Display names — agent name should not be a raw ID
try:
    _, body = fetch("/api/office")
    agents = json.loads(body).get("agents", [])
    raw_id_names = [a for a in agents if a.get("name", "") == a.get("id", "")]
    if raw_id_names:
        bad = [f"{a['id']}={a['name']}" for a in raw_id_names]
        record("ux/display_names", "fail", f"Agent name equals raw ID: {bad}")
    else:
        record("ux/display_names", "pass")
except Exception as e:
    record("ux/display_names", "fail", str(e))

# 8e. No false active — working agents must have active gateway session
try:
    _, body = fetch("/api/office")
    working_agents = [a for a in json.loads(body).get("agents", []) if a.get("status") == "working"]

    if working_agents and gw_sessions is not None:
        now_ms = datetime.now(timezone.utc).timestamp() * 1000
        five_min_ms = 5 * 60 * 1000

        # Build set of active agent IDs from gateway
        gw_active = set()
        for sess in gw_sessions:
            key = sess.get("key", "")
            if ":cron:" in key or ":watercooler" in key:
                continue
            if (now_ms - sess.get("updatedAt", 0)) < five_min_ms:
                parts = key.split(":")
                if len(parts) >= 2 and parts[0] == "agent":
                    gw_active.add(parts[1])

        false_positives = [a["id"] for a in working_agents if a["id"] not in gw_active]
        if false_positives:
            record("ux/no_false_active", "fail",
                   f"Working status but no active gateway session: {false_positives}")
        else:
            record("ux/no_false_active", "pass")
    elif not working_agents:
        record("ux/no_false_active", "pass")
    else:
        record("ux/no_false_active", "warn", "Gateway unreachable, cannot verify")
except Exception as e:
    record("ux/no_false_active", "fail", str(e))

# 8f. System restart endpoint responds
try:
    url = BASE_URL + "/api/system/restart"
    data = json.dumps({"service": "gateway"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        code = resp.status
        body = json.loads(resp.read())
    if code == 200 and body.get("ok"):
        record("ux/system_restart_endpoint", "pass")
    else:
        record("ux/system_restart_endpoint", "fail", f"HTTP {code}, body={body}")
except Exception as e:
    record("ux/system_restart_endpoint", "fail", str(e))


# ── Output ───────────────────────────────────────────────────────────────────

result = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "passed": passed,
    "failed": failed,
    "checks": checks,
}

print(json.dumps(result, indent=2))
sys.exit(0 if failed == 0 else 1)
