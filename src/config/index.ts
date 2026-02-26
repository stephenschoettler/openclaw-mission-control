/**
 * Mission Control — Central Configuration
 *
 * All environment-specific values live here.
 * Override any of these via environment variables or a .env.local file.
 *
 * See README.md for full documentation.
 */

import os from 'os';
import path from 'path';

// ── Paths ───────────────────────────────────────────────────────────────────

export const HOME_DIR = process.env.HOME || os.homedir();
export const OPENCLAW_HOME = path.join(HOME_DIR, '.openclaw');

/** Path to the openclaw.mjs CLI directory (override with OPENCLAW_DIR env var) */
export const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(HOME_DIR, 'dev', 'openclaw');

// ── Gateway ─────────────────────────────────────────────────────────────────

/**
 * URL for the OpenClaw gateway API.
 * Override: OPENCLAW_GATEWAY_URL=http://localhost:3000
 */
export const OPENCLAW_GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3000';

// ── Agents ──────────────────────────────────────────────────────────────────

/**
 * The "main" agent ID alias — displayed as this name in the UI.
 * Override: MAIN_AGENT_ALIAS=babbage
 */
export const MAIN_AGENT_ALIAS = process.env.MAIN_AGENT_ALIAS || 'babbage';
export const MAIN_AGENT_NAME = process.env.MAIN_AGENT_NAME || 'Babbage';

/**
 * Sub-agents to hide from the team page unless they are actively working.
 * Comma-separated list.
 * Override: SUB_AGENT_IDS=code-frontend,code-backend,code-devops
 */
export const SUB_AGENT_IDS: string[] = (process.env.SUB_AGENT_IDS || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

// ── Telegram notify ─────────────────────────────────────────────────────────

/**
 * Telegram user/chat ID to send notifications to.
 * Override: TELEGRAM_TARGET_ID=123456789
 */
export const TELEGRAM_TARGET_ID = process.env.TELEGRAM_TARGET_ID || '';

// ── Docker ──────────────────────────────────────────────────────────────────

/**
 * Docker containers to monitor on the System page.
 * If empty (default), containers are auto-discovered from "docker ps".
 * Override: DOCKER_CONTAINERS=my-api,my-db,my-nginx
 */
export const DOCKER_CONTAINERS: string[] = (process.env.DOCKER_CONTAINERS || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

// ── Systemd services ─────────────────────────────────────────────────────────

/**
 * Systemd user services to monitor on the System page.
 * Comma-separated. Override: SYSTEMD_SERVICES=openclaw-gateway,mission-control
 */
export const SYSTEMD_SERVICES: string[] = (
  process.env.SYSTEMD_SERVICES || 'openclaw-gateway,mission-control'
)
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

// ── File browser roots ───────────────────────────────────────────────────────

/**
 * Workspace roots to show in the Files browser.
 * Auto-discovered from ~/.openclaw/workspace-* directories if not set.
 * Override: FILE_BROWSER_ROOTS=/home/me/.openclaw/workspace,/projects
 */
export const FILE_BROWSER_ROOTS: string[] = (process.env.FILE_BROWSER_ROOTS || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);
