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

function isAllowed(p: string): boolean {
  if (p.includes('..')) return false;
  const resolved = path.resolve(p);
  return ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(root + '/'));
}

export async function GET(req: NextRequest) {
  const dirPath = req.nextUrl.searchParams.get('path');
  if (!dirPath) return NextResponse.json({ error: 'path required' }, { status: 400 });
  if (!isAllowed(dirPath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const resolved = path.resolve(dirPath);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return NextResponse.json({ error: 'Not a directory' }, { status: 400 });

    const entries = fs.readdirSync(resolved);
    const items = entries
      .filter(name => !name.startsWith('.'))
      .map(name => {
        try {
          const full = path.join(resolved, name);
          const s = fs.statSync(full);
          return {
            name,
            path: full,
            type: s.isDirectory() ? 'dir' as const : 'file' as const,
            size: s.size,
            modified: s.mtime.toISOString(),
            ext: s.isDirectory() ? '' : (path.extname(name).slice(1).toLowerCase() || ''),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ name: string; path: string; type: 'file' | 'dir'; size: number; modified: string; ext: string }>;

    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const targetDir = formData.get('path') as string;
    const file = formData.get('file') as File;

    if (!targetDir || !file) return NextResponse.json({ error: 'path and file required' }, { status: 400 });
    if (!isAllowed(targetDir)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

    const savePath = path.join(path.resolve(targetDir), file.name);
    if (!isAllowed(savePath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(savePath, buffer);

    return NextResponse.json({ success: true, path: savePath });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 });
  if (!isAllowed(filePath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const resolved = path.resolve(filePath);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) return NextResponse.json({ error: 'Cannot delete directories' }, { status: 400 });
    fs.unlinkSync(resolved);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
