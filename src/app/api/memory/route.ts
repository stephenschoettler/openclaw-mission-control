import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MEMORY_DIR = path.join(process.env.HOME || '/home/w0lf', '.openclaw', 'workspace', 'memory');
const MEMORY_FILE = path.join(process.env.HOME || '/home/w0lf', '.openclaw', 'workspace', 'MEMORY.md');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');

  // Return full content of a specific file
  if (file) {
    try {
      let filePath: string;
      if (file === 'MEMORY.md') {
        filePath = MEMORY_FILE;
      } else {
        filePath = path.join(MEMORY_DIR, file);
      }
      // Prevent directory traversal
      if (!filePath.startsWith(MEMORY_DIR) && filePath !== MEMORY_FILE) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json({ filename: file, content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  // List all memory files
  const files: Array<{ filename: string; preview: string; size: number; mtime: string; pinned?: boolean }> = [];

  // Add pinned MEMORY.md
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const stat = fs.statSync(MEMORY_FILE);
      const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const lines = content.split('\n').slice(0, 3).join('\n');
      files.push({ filename: 'MEMORY.md', preview: lines, size: stat.size, mtime: stat.mtime.toISOString(), pinned: true });
    }
  } catch { /* ignore */ }

  // Add memory dir files
  try {
    if (fs.existsSync(MEMORY_DIR)) {
      const entries = fs.readdirSync(MEMORY_DIR)
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const fp = path.join(MEMORY_DIR, f);
          const stat = fs.statSync(fp);
          const content = fs.readFileSync(fp, 'utf-8');
          const lines = content.split('\n').slice(0, 3).join('\n');
          return { filename: f, preview: lines, size: stat.size, mtime: stat.mtime.toISOString() };
        })
        .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
      files.push(...entries);
    }
  } catch { /* ignore */ }

  return NextResponse.json(files);
}
