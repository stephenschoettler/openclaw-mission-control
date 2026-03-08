import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const AGENTS_DIR = path.join(process.env.HOME || os.homedir(), '.openclaw', 'agents');

interface FeedEntry {
  role: string;
  content: string;
  timestamp: string;
}

function extractContent(message: Record<string, unknown>): string {
  const content = message.content;
  if (typeof content === 'string') return content.slice(0, 500);
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const part of content) {
      if (part && typeof part === 'object') {
        const p = part as Record<string, unknown>;
        if (p.type === 'text' && typeof p.text === 'string') {
          texts.push(p.text);
        } else if (p.type === 'tool_use' && typeof p.name === 'string') {
          texts.push(`[tool: ${p.name}]`);
        } else if (p.type === 'tool_result') {
          const nested = p.content;
          if (Array.isArray(nested)) {
            for (const n of nested) {
              if (n && typeof n === 'object' && (n as Record<string, unknown>).type === 'text') {
                texts.push(String((n as Record<string, unknown>).text || ''));
              }
            }
          } else if (typeof nested === 'string') {
            texts.push(nested);
          }
        }
      }
    }
    return texts.join(' ').slice(0, 500);
  }
  return '';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || /[^a-zA-Z0-9_\-]/.test(id)) {
    return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
  }

  const sessionsDir = path.join(AGENTS_DIR, id, 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    return NextResponse.json({ error: `No sessions directory for agent: ${id}` }, { status: 404 });
  }

  let jsonlFiles: { name: string; mtime: number }[] = [];
  try {
    jsonlFiles = fs
      .readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl') && !f.endsWith('.lock'))
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return NextResponse.json({ error: 'Failed to read sessions directory' }, { status: 500 });
  }

  if (jsonlFiles.length === 0) {
    return NextResponse.json({ feed: [] });
  }

  const latestFile = path.join(sessionsDir, jsonlFiles[0].name);
  let lines: string[] = [];

  try {
    const raw = fs.readFileSync(latestFile, 'utf-8');
    lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
  } catch {
    return NextResponse.json({ error: 'Failed to read session file' }, { status: 500 });
  }

  const last30 = lines.slice(-30);

  const feed: FeedEntry[] = [];
  for (const line of last30) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const msg = entry.message as Record<string, unknown> | undefined;
      if (!msg) continue;

      const role = (msg.role as string) || (entry.type as string) || 'unknown';
      const content = extractContent(msg);
      const timestamp = (entry.timestamp as string) || new Date().toISOString();

      feed.push({ role, content, timestamp });
    } catch {
      // skip malformed lines
    }
  }

  return NextResponse.json({ feed, sessionFile: jsonlFiles[0].name });
}
