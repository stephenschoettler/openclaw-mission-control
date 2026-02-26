import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { DOCKER_CONTAINERS as CONFIGURED_CONTAINERS, SYSTEMD_SERVICES } from '@/config';

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

function getAllDockerContainers(): { name: string; status: string; uptime: string }[] {
  let raw = '';
  try {
    raw = execSync('docker ps -a --format json', { timeout: 5000, encoding: 'utf8' }).trim();
  } catch {
    return [];
  }
  const results: { name: string; status: string; uptime: string }[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line);
      const name = p.Names || p.Name || '';
      if (!name) continue;
      results.push({
        name,
        status: p.State || 'unknown',
        uptime: p.RunningFor || p.Status || '',
      });
    } catch {}
  }
  return results;
}

function getDockerStatuses() {
  const allContainers = getAllDockerContainers();

  // If explicit list configured, filter to those; otherwise show all discovered
  const containerNames = CONFIGURED_CONTAINERS.length > 0
    ? CONFIGURED_CONTAINERS
    : allContainers.map(c => c.name);

  const runningMap: Record<string, { status: string; uptime: string }> = {};
  for (const c of allContainers) {
    runningMap[c.name] = { status: c.status, uptime: c.uptime };
  }

  return containerNames.map(name => {
    const d = runningMap[name];
    return d
      ? { name, type: 'docker', status: d.status, uptime: d.uptime }
      : { name, type: 'docker', status: 'stopped', uptime: '' };
  });
}

export async function GET() {
  const systemd = SYSTEMD_SERVICES.map(getSystemdStatus);
  const docker = getDockerStatuses();
  return NextResponse.json({ systemd, docker, timestamp: new Date().toISOString() });
}
