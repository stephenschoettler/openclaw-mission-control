import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Skill {
  name: string;
  displayName: string;
  description: string;
  hasScripts: boolean;
  content: string;
}

function formatDisplayName(name: string): string {
  return name
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractDescription(content: string): string {
  // Try YAML frontmatter first
  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      const frontmatter = content.slice(3, end);
      const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m);
      if (descMatch) {
        return descMatch[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  // Fall back: strip # heading lines, find first non-empty non-heading line
  const lines = content.split('\n');
  let seenHeading = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      seenHeading = true;
      continue;
    }
    // Skip frontmatter delimiters
    if (trimmed === '---') continue;
    // Once we've seen a heading, return next non-empty non-heading line
    if (seenHeading) {
      // Strip bold markers and extra chars
      return trimmed.replace(/\*\*/g, '').replace(/^[-*>]\s*/, '');
    }
  }

  return '';
}

export async function GET() {
  try {
    const skillsDir = path.join(os.homedir(), '.openclaw', 'workspace', 'skills');

    if (!fs.existsSync(skillsDir)) {
      return NextResponse.json([]);
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = path.join(skillsDir, entry.name);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      if (!fs.existsSync(skillMdPath)) continue;

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const hasScripts = fs.existsSync(path.join(skillPath, 'scripts'));
      const description = extractDescription(content);

      skills.push({
        name: entry.name,
        displayName: formatDisplayName(entry.name),
        description,
        hasScripts,
        content,
      });
    }

    // Sort alphabetically by name
    skills.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(skills);
  } catch (err) {
    console.error('Skills API error:', err);
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 });
  }
}
