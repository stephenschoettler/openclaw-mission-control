import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import os from 'os';
const HOME = process.env.HOME || os.homedir();

function getWorkspaceRoots(): string[] {
  const ocHome = path.join(HOME, '.openclaw');
  const roots: string[] = [];
  // Always include base workspace and openclaw metadata dirs
  roots.push(path.join(ocHome, 'memory'));
  roots.push(path.join(ocHome, 'cron'));
  // Auto-discover all workspace-* directories
  try {
    const entries = fs.readdirSync(ocHome);
    for (const entry of entries) {
      if (entry === 'workspace' || entry.startsWith('workspace-')) {
        roots.push(path.join(ocHome, entry));
      }
    }
  } catch { /* openclaw not installed */ }
  return roots;
}

const ALLOWED_ROOTS = getWorkspaceRoots();

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
