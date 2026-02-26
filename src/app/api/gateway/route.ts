import { NextResponse } from 'next/server';
import os from 'os';
import { OPENCLAW_HOME } from '@/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CONFIG_PATH = path.join(OPENCLAW_HOME, 'openclaw.json');

interface GatewayResponse {
  status: 'online' | 'offline';
  pid: number | null;
  uptime: string;
  memory: string;
  rss_kb: number;
  primary_model: string;
  compaction_mode: string;
  queue_mode: string;
  agents_count: number;
  skills_count: number;
  gateway_port: string | number;
}

function formatMemory(rssKb: number): string {
  if (rssKb > 1_048_576) return `${(rssKb / 1_048_576).toFixed(1)} GB`;
  if (rssKb > 1024) return `${Math.round(rssKb / 1024)} MB`;
  return `${rssKb} KB`;
}

export async function GET() {
  const result: GatewayResponse = {
    status: 'offline',
    pid: null,
    uptime: '',
    memory: '',
    rss_kb: 0,
    primary_model: '',
    compaction_mode: 'auto',
    queue_mode: '',
    agents_count: 0,
    skills_count: 0,
    gateway_port: 3000,
  };

  // Get gateway process info
  try {
    const pgrepOut = execSync('pgrep -f openclaw-gateway 2>/dev/null || true', {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();

    const pids = pgrepOut
      .split('\n')
      .map(p => p.trim())
      .filter(p => p && /^\d+$/.test(p));

    if (pids.length > 0) {
      const pid = pids[0];
      result.status = 'online';
      result.pid = parseInt(pid, 10);

      try {
        const psOut = execSync(`ps -p ${pid} -o etime=,rss= 2>/dev/null || true`, {
          encoding: 'utf-8',
          timeout: 3000,
        }).trim();

        const parts = psOut.trim().split(/\s+/);
        if (parts.length >= 2) {
          result.uptime = parts[0];
          const rssKb = parseInt(parts[1], 10);
          if (!isNaN(rssKb)) {
            result.rss_kb = rssKb;
            result.memory = formatMemory(rssKb);
          }
        }
      } catch {
        // ignore ps errors
      }
    }
  } catch {
    // ignore pgrep errors
  }

  // Read openclaw.json for config info
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

    const defaults = config?.agents?.defaults || {};
    const primary = defaults?.model?.primary || '';
    // Strip provider prefix for display
    result.primary_model = primary.includes('/')
      ? primary.split('/').pop() || primary
      : primary;

    result.compaction_mode = defaults?.compaction?.mode || 'auto';
    result.queue_mode = config?.gateway?.queueMode || config?.gateway?.mode || '';
    result.gateway_port = config?.gateway?.port || 3000;

    const agentList: unknown[] = config?.agents?.list || [];
    result.agents_count = agentList.length;

    const skillEntries = config?.skills?.entries || {};
    result.skills_count = Object.keys(skillEntries).length;
  } catch {
    // ignore config errors
  }

  return NextResponse.json(result);
}
