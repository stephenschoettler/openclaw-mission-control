import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const OPENCLAW_HOME = process.env.HOME
  ? path.join(process.env.HOME, '.openclaw')
  : '/home/w0lf/.openclaw';
const AGENTS_DIR = path.join(OPENCLAW_HOME, 'agents');
const CONFIG_PATH = path.join(OPENCLAW_HOME, 'openclaw.json');

// Rough cost rates (fallback when cost field absent)
const INPUT_RATE = 3 / 1_000_000;   // $3 per M input
const OUTPUT_RATE = 15 / 1_000_000; // $15 per M output

interface AgentCost {
  agent: string;
  agent_id: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
}

interface DayEntry {
  date: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface PeriodData {
  total: number;
  byAgent: AgentCost[];
  byDay: DayEntry[];
}

interface CostsResponse {
  today: PeriodData;
  '7d': PeriodData;
  '30d': PeriodData;
}

function getAgentNames(): Record<string, string> {
  const names: Record<string, string> = {};
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const agentList: { id?: string; name?: string }[] = config?.agents?.list || [];
    for (const ag of agentList) {
      if (ag.id && ag.name) names[ag.id] = ag.name;
    }
  } catch {
    // ignore
  }
  return names;
}

function pad2(n: number) { return n.toString().padStart(2, '0'); }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nDaysAgoStr(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function parseJSONL(filePath: string): Promise<{
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  cost: number;
}[]> {
  const results: {
    date: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
    cost: number;
  }[] = [];

  try {
    const stat = fs.statSync(filePath);
    // Skip very old files (> 35 days) for performance
    const cutoff = Date.now() - 35 * 24 * 60 * 60 * 1000;
    if (stat.mtimeMs < cutoff) return results;

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as {
          type?: string;
          timestamp?: string;
          message?: {
            role?: string;
            model?: string;
            usage?: {
              input?: number;
              output?: number;
              cacheRead?: number;
              totalTokens?: number;
              cost?: { total?: number };
            };
          };
        };
        if (obj.type !== 'message') continue;
        const msg = obj.message;
        if (!msg || msg.role !== 'assistant') continue;
        const usage = msg.usage;
        if (!usage || (usage.totalTokens || 0) === 0) continue;
        // Skip delivery mirrors
        if ((msg.model || '').includes('delivery-mirror')) continue;

        const ts = obj.timestamp || '';
        let date = '';
        if (ts) {
          try { date = ts.substring(0, 10); } catch { date = ''; }
        }
        if (!date) continue;

        const inp = usage.input || 0;
        const out = usage.output || 0;
        const cr = usage.cacheRead || 0;
        const tt = usage.totalTokens || 0;
        const costVal = typeof usage.cost === 'object' && usage.cost
          ? (usage.cost.total || 0)
          : inp * INPUT_RATE + out * OUTPUT_RATE;

        results.push({
          date,
          inputTokens: inp,
          outputTokens: out,
          cacheReadTokens: cr,
          totalTokens: tt,
          cost: costVal,
        });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // ignore file errors
  }
  return results;
}

export async function GET() {
  const today = todayStr();
  const date7d = nDaysAgoStr(7);
  const date30d = nDaysAgoStr(30);

  const agentNames = getAgentNames();

  // Accumulator: agent -> date -> totals
  type Bucket = {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    total_tokens: number;
    cost: number;
  };
  const agentDayData = new Map<string, Map<string, Bucket>>();

  let agentDirs: string[] = [];
  try {
    agentDirs = fs.readdirSync(AGENTS_DIR).filter(d =>
      fs.statSync(path.join(AGENTS_DIR, d)).isDirectory()
    );
  } catch {
    // return empty
  }

  for (const agentId of agentDirs) {
    const sessionsDir = path.join(AGENTS_DIR, agentId, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;

    let files: string[] = [];
    try {
      files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => path.join(sessionsDir, f));
    } catch {
      continue;
    }

    for (const filePath of files) {
      const rows = await parseJSONL(filePath);
      for (const row of rows) {
        if (row.date < date30d) continue;
        if (!agentDayData.has(agentId)) agentDayData.set(agentId, new Map());
        const dayMap = agentDayData.get(agentId)!;
        const existing = dayMap.get(row.date) || {
          input_tokens: 0, output_tokens: 0, cache_read_tokens: 0,
          total_tokens: 0, cost: 0,
        };
        existing.input_tokens += row.inputTokens;
        existing.output_tokens += row.outputTokens;
        existing.cache_read_tokens += row.cacheReadTokens;
        existing.total_tokens += row.totalTokens;
        existing.cost += row.cost;
        dayMap.set(row.date, existing);
      }
    }
  }

  function buildPeriod(startDate: string): PeriodData {
    const byAgent: AgentCost[] = [];
    const dayMap = new Map<string, DayEntry>();

    for (const [agentId, dateBuckets] of Array.from(agentDayData.entries())) {
      const agentName = agentNames[agentId] || agentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      let totalCost = 0, totalInput = 0, totalOutput = 0, totalCr = 0, totalTt = 0;

      for (const [date, bucket] of Array.from(dateBuckets.entries())) {
        if (date < startDate) continue;
        totalCost += bucket.cost;
        totalInput += bucket.input_tokens;
        totalOutput += bucket.output_tokens;
        totalCr += bucket.cache_read_tokens;
        totalTt += bucket.total_tokens;

        const existing = dayMap.get(date) || { date, cost: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0 };
        existing.cost += bucket.cost;
        existing.input_tokens += bucket.input_tokens;
        existing.output_tokens += bucket.output_tokens;
        existing.total_tokens += bucket.total_tokens;
        dayMap.set(date, existing);
      }

      if (totalCost > 0 || totalTt > 0) {
        byAgent.push({
          agent: agentName,
          agent_id: agentId,
          input_tokens: totalInput,
          output_tokens: totalOutput,
          cache_read_tokens: totalCr,
          total_tokens: totalTt,
          cost: Math.round(totalCost * 10000) / 10000,
        });
      }
    }

    byAgent.sort((a, b) => b.cost - a.cost);

    const byDay: DayEntry[] = Array.from(dayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, cost: Math.round(d.cost * 10000) / 10000 }));

    const total = Math.round(byAgent.reduce((s, a) => s + a.cost, 0) * 10000) / 10000;

    return { total, byAgent, byDay };
  }

  const result: CostsResponse = {
    today: buildPeriod(today),
    '7d': buildPeriod(date7d),
    '30d': buildPeriod(date30d),
  };

  return NextResponse.json(result);
}
