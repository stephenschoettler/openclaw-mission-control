import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/home/w0lf';

const ALLOWED_ROOTS = [
  `${HOME}/.openclaw/workspace`,
  `${HOME}/.openclaw/workspace-answring`,
  `${HOME}/.openclaw/workspace-answring-dev`,
  `${HOME}/.openclaw/workspace-answring-marketing`,
  `${HOME}/.openclaw/workspace-answring-ops`,
  `${HOME}/.openclaw/workspace-answring-sales`,
  `${HOME}/.openclaw/workspace-answring-security`,
  `${HOME}/.openclaw/workspace-answring-strategist`,
  `${HOME}/.openclaw/workspace-browser`,
  `${HOME}/.openclaw/workspace-comms`,
  `${HOME}/.openclaw/workspace-dad`,
  `${HOME}/.openclaw/workspace-dev`,
  `${HOME}/.openclaw/workspace-dev-backend`,
  `${HOME}/.openclaw/workspace-dev-devops`,
  `${HOME}/.openclaw/workspace-dev-frontend`,
  `${HOME}/.openclaw/workspace-hustle`,
  `${HOME}/.openclaw/workspace-main`,
  `${HOME}/.openclaw/workspace-pop`,
  `${HOME}/.openclaw/workspace-ralph`,
  `${HOME}/.openclaw/workspace-tldr`,
  `${HOME}/.openclaw/memory`,
  `${HOME}/.openclaw/cron`,
  `${HOME}/mission-control/src`,
];

const TEXT_EXTENSIONS = new Set([
  'md', 'txt', 'json', 'ts', 'tsx', 'js', 'jsx', 'py', 'sh', 'yaml', 'yml',
  'toml', 'env', 'csv', 'html', 'css', 'xml', 'log', 'conf', 'ini',
  'gitignore', 'lock',
]);

function isAllowed(p: string): boolean {
  if (p.includes('..')) return false;
  const resolved = path.resolve(p);
  return ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(root + '/'));
}

const MAX_SIZE = 100 * 1024; // 100KB

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 });
  if (!isAllowed(filePath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const resolved = path.resolve(filePath);
    const ext = path.extname(resolved).slice(1).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext) && ext !== '') {
      return NextResponse.json({ error: 'Binary or unsupported file type' }, { status: 415 });
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) return NextResponse.json({ error: 'Not a file' }, { status: 400 });

    let content: string;
    let truncated = false;

    if (stat.size > MAX_SIZE) {
      const buf = Buffer.alloc(MAX_SIZE);
      const fd = fs.openSync(resolved, 'r');
      fs.readSync(fd, buf, 0, MAX_SIZE, 0);
      fs.closeSync(fd);
      content = buf.toString('utf-8') + '\n\n--- Truncated (file exceeds 100KB) ---';
      truncated = true;
    } else {
      content = fs.readFileSync(resolved, 'utf-8');
    }

    return NextResponse.json({ content, truncated });
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: filePath, content } = body as { path: string; content: string };

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'path and content required' }, { status: 400 });
    }
    if (!isAllowed(filePath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const resolved = path.resolve(filePath);
    fs.writeFileSync(resolved, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
  }
}
