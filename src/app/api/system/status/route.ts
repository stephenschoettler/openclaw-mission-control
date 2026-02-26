import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

const DOCKER_CONTAINERS = ['answring-api', 'answring-nginx', 'searxng', 'synclounge', 'open-webui'];
const SYSTEMD_SERVICES = ['openclaw-gateway', 'mission-control'];

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim();
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'stdout' in e) {
      return String((e as Record<string, unknown>).stdout || '').trim();
    }
    return '';
  }
}

function getSystemdStatus(service: string) {
  const active = runCmd(`systemctl --user is-active ${service}`);
  let uptime = '';
  try {
    const show = runCmd(`systemctl --user show ${service} --property=ActiveEnterTimestamp`);
    const match = show.match(/ActiveEnterTimestamp=(.+)/);
    if (match && match[1] && match[1] !== 'n/a') {
      const since = new Date(match[1]);
      const diffSec = Math.floor((Date.now() - since.getTime()) / 1000);
      if (diffSec < 60) uptime = `${diffSec}s`;
      else if (diffSec < 3600) uptime = `${Math.floor(diffSec / 60)}m`;
      else if (diffSec < 86400) uptime = `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`;
      else uptime = `${Math.floor(diffSec / 86400)}d`;
    }
  } catch {}
  return { name: service, type: 'systemd', status: active === 'active' ? 'active' : (active || 'unknown'), uptime };
}

function getDockerStatuses() {
  let raw = '';
  try {
    raw = execSync('docker ps --format json', { timeout: 5000, encoding: 'utf8' }).trim();
  } catch {
    return DOCKER_CONTAINERS.map(name => ({ name, type: 'docker', status: 'unknown', uptime: '' }));
  }
  const running: Record<string, { status: string; uptime: string }> = {};
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line);
      const n = p.Names || p.Name || '';
      running[n] = { status: p.State || 'running', uptime: p.RunningFor || p.Status || '' };
    } catch {}
  }
  return DOCKER_CONTAINERS.map(name => {
    const d = running[name];
    return d ? { name, type: 'docker', status: d.status, uptime: d.uptime } : { name, type: 'docker', status: 'stopped', uptime: '' };
  });
}

export async function GET() {
  const systemd = SYSTEMD_SERVICES.map(getSystemdStatus);
  const docker = getDockerStatuses();
  return NextResponse.json({ systemd, docker, timestamp: new Date().toISOString() });
}
