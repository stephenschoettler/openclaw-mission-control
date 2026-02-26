import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FILE_BROWSER_ROOTS, OPENCLAW_HOME } from '@/config';

/**
 * GET /api/workspaces
 * Returns a list of workspace directories for the file browser.
 * Auto-discovers ~/.openclaw/workspace-* dirs unless FILE_BROWSER_ROOTS is set.
 */
export async function GET() {
  // If explicitly configured, use that list
  if (FILE_BROWSER_ROOTS.length > 0) {
    const workspaces = FILE_BROWSER_ROOTS
      .filter(p => fs.existsSync(p))
      .map(p => ({
        path: p,
        label: path.basename(p),
      }));
    return NextResponse.json(workspaces);
  }

  // Auto-discover
  const workspaces: { path: string; label: string }[] = [];
  try {
    const entries = fs.readdirSync(OPENCLAW_HOME);
    const sorted = entries
      .filter(e => e === 'workspace' || e.startsWith('workspace-'))
      .sort();

    for (const entry of sorted) {
      const fullPath = path.join(OPENCLAW_HOME, entry);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          const label = entry === 'workspace'
            ? 'Default Workspace'
            : entry.replace('workspace-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          workspaces.push({ path: fullPath, label });
        }
      } catch { /* skip */ }
    }
  } catch { /* openclaw not installed */ }

  return NextResponse.json(workspaces);
}
