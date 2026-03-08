import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENT_WORKSPACE_MAP: Record<string, string> = {
  'main':          'workspace',
  'code-monkey':   'workspace-dev',
  'code-backend':  'workspace-dev-backend',
  'code-frontend': 'workspace-dev-frontend',
  'code-security': 'workspace-dev-security',
  'code-docs':     'workspace-dev-docs',
  'ralph':         'workspace-ralph',
  'pixel':         'workspace-pixel',
};

function getWorkspacePath(agentId: string): string | null {
  const dir = AGENT_WORKSPACE_MAP[agentId] || `workspace-${agentId}`;
  const home = process.env.HOME || '/home/w0lf';
  return path.join(home, '.openclaw', dir, 'TO-DOS.md');
}

interface TodoItem {
  title: string;
  date: string;
  action: string;
  problem: string;
  files: string;
  solution: string;
  priority: 1 | 2 | 3;
  assignee?: string;
  prLink?: string;
  snoozeUntil?: string;
}

interface CompletedItem {
  action: string;
  completedAt: string;
}

function parsePriority(line: string): 1 | 2 | 3 {
  if (/\*\*P1\*\*/.test(line)) return 1;
  if (/\*\*P2\*\*/.test(line)) return 2;
  return 3;
}

function parseAssignee(line: string): string | undefined {
  const m = line.match(/\*\*Assignee:\*\*\s*([^\s*][^*]*?)(?=\s*\*\*|$)/i);
  return m ? m[1].trim() : undefined;
}

function parsePrLink(line: string): string | undefined {
  const m = line.match(/\*\*PR:\*\*\s*(#\d+)/i);
  return m ? m[1].trim() : undefined;
}

function parseSnoozeUntil(line: string): string | undefined {
  const m = line.match(/\*\*Snooze:\*\*\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i);
  if (!m) return undefined;
  return new Date(m[1]).toISOString();
}

function parseTodosFile(content: string): { todos: TodoItem[]; completed: CompletedItem[] } {
  const todos: TodoItem[] = [];
  const completed: CompletedItem[] = [];
  const lines = content.split('\n');

  let currentTitle = '';
  let currentDate = '';
  let currentAction = '';
  let currentProblem = '';
  let currentFiles = '';
  let currentSolution = '';
  let currentPriority: 1 | 2 | 3 = 3;
  let currentAssignee: string | undefined;
  let currentPrLink: string | undefined;
  let currentSnoozeUntil: string | undefined;
  let inSection = false;
  let inCompleted = false;

  const flushTodo = () => {
    if (inSection && currentAction) {
      const item: TodoItem = {
        title: currentTitle,
        date: currentDate,
        action: currentAction,
        problem: currentProblem,
        files: currentFiles,
        solution: currentSolution,
        priority: currentPriority,
      };
      if (currentAssignee) item.assignee = currentAssignee;
      if (currentPrLink) item.prLink = currentPrLink;
      if (currentSnoozeUntil) item.snoozeUntil = currentSnoozeUntil;
      todos.push(item);
    }
  };

  const resetCurrent = () => {
    currentAction = ''; currentProblem = ''; currentFiles = ''; currentSolution = '';
    currentPriority = 3; currentAssignee = undefined; currentPrLink = undefined; currentSnoozeUntil = undefined;
  };

  for (const line of lines) {
    if (line.match(/^##\s+Completed/i)) {
      flushTodo(); inSection = false; inCompleted = true; continue;
    }
    if (inCompleted) {
      const m = line.match(/^-\s+\*\*(.+?)\*\*.*✓\s*completed:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (m) completed.push({ action: m[1].trim(), completedAt: m[2].trim() });
      continue;
    }
    const headingMatch = line.match(/^##\s+(.+?)\s*-\s*(.+)$/);
    if (headingMatch) {
      flushTodo();
      currentTitle = headingMatch[1].trim(); currentDate = headingMatch[2].trim();
      resetCurrent();
      inSection = true; continue;
    }
    if (!inSection) continue;
    if (currentTitle.toLowerCase() === 'completed') { inCompleted = true; continue; }
    const actionMatch = line.match(/^-\s+\*\*(.+?)\*\*/);
    if (actionMatch) {
      if (currentAction) { flushTodo(); resetCurrent(); }
      currentAction = actionMatch[1].trim();
      currentPriority = parsePriority(line);
      currentAssignee = parseAssignee(line);
      currentPrLink = parsePrLink(line);
      currentSnoozeUntil = parseSnoozeUntil(line);
      const rest = line.replace(/^-\s+\*\*.+?\*\*/, '').replace(/^[\s:—–-]+/, '').trim();
      if (rest) {
        const probMatch = rest.match(/\*\*Problem:\*\*\s*([^*]+?)(?=\s*\*\*(?:Files?|Solution|Assignee|PR|Snooze):|$)/i);
        const filesMatch = rest.match(/\*\*Files?:\*\*\s*([^*]+?)(?=\s*\*\*(?:Problem|Solution|Assignee|PR|Snooze):|$)/i);
        const solMatch = rest.match(/\*\*Solution:\*\*\s*([^*]+?)(?=\s*\*\*(?:Problem|Files?|Assignee|PR|Snooze):|$)/i);
        if (probMatch) currentProblem = probMatch[1].trim(); else if (!rest.match(/^\*\*/)) currentProblem = rest;
        if (filesMatch) currentFiles = filesMatch[1].trim();
        if (solMatch) currentSolution = solMatch[1].trim();
      }
      continue;
    }
    const subMatch = line.match(/^\s+-\s+\*\*(Problem|Files?|Solution|Issue|Task|Note|Assignee|PR|Snooze)\*\*[:\s]+(.+)$/i);
    if (subMatch) {
      const key = subMatch[1].toLowerCase(); const val = subMatch[2].trim();
      if (key === 'problem' || key === 'issue') currentProblem = val;
      else if (key.startsWith('file')) currentFiles = val;
      else if (key === 'solution') currentSolution = val;
      else if (key === 'task' || key === 'note') currentProblem = val;
      else if (key === 'assignee') currentAssignee = val;
      else if (key === 'pr') currentPrLink = val.startsWith('#') ? val : `#${val}`;
      else if (key === 'snooze') {
        const sm = val.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
        if (sm) currentSnoozeUntil = new Date(sm[1]).toISOString();
      }
    }
  }
  flushTodo();
  todos.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.date.localeCompare(b.date));
  return { todos, completed };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const filePath = getWorkspacePath(agentId);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ agentId, todos: [], completed: [] });
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const { todos, completed } = parseTodosFile(content);
  return NextResponse.json({ agentId, todos, completed });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const filePath = getWorkspacePath(agentId);
  if (!filePath) {
    return NextResponse.json({ error: 'Unknown agent' }, { status: 404 });
  }

  const body = await req.json() as {
    action: string;
    problem: string;
    files: string;
    solution?: string;
    priority?: 1 | 2 | 3;
  };

  const { action, problem, files, solution, priority = 3 } = body;
  if (!action || !problem) {
    return NextResponse.json({ error: 'Missing required fields: action, problem' }, { status: 400 });
  }

  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf-8');
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    existing = '# TO-DOS\n';
  }

  // Duplicate detection: check active todos for same action (case-insensitive)
  const { todos } = parseTodosFile(existing);
  const normalizedAction = action.trim().toLowerCase();
  const duplicate = todos.find(t => t.action.trim().toLowerCase() === normalizedAction);
  if (duplicate) {
    return NextResponse.json({ duplicate: true, existing: duplicate }, { status: 409 });
  }

  const priorityTag = priority <= 2 ? ` **P${priority}**` : '';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16);
  const heading = `\n## ${action} - ${dateStr} ${timeStr}\n`;
  const entry = `- **${action}**${priorityTag}\n  - **Problem:** ${problem}\n  - **Files:** ${files || 'N/A'}${solution ? `\n  - **Solution:** ${solution}` : ''}\n`;

  // Insert before ## Completed section, or append
  const completedIdx = existing.search(/^##\s+Completed/im);
  let updated: string;
  if (completedIdx >= 0) {
    updated = existing.slice(0, completedIdx) + heading + entry + '\n' + existing.slice(completedIdx);
  } else {
    updated = existing.trimEnd() + '\n' + heading + entry;
  }

  fs.writeFileSync(filePath, updated, 'utf-8');
  return NextResponse.json({ ok: true, agentId, action }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const filePath = getWorkspacePath(agentId);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'No TO-DOS.md found for agent' }, { status: 404 });
  }

  const body = await req.json() as { action: string; snoozeUntil: string };
  const { action, snoozeUntil } = body;
  if (!action || !snoozeUntil) {
    return NextResponse.json({ error: 'Missing required fields: action, snoozeUntil' }, { status: 400 });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const escapedAction = action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const actionRegex = new RegExp(`^-\\s+\\*\\*${escapedAction}\\*\\*`);

  // Format snoozeUntil (ISO) → "YYYY-MM-DD HH:MM"
  const snoozeDate = new Date(snoozeUntil);
  const snoozeFormatted = `${snoozeDate.toISOString().slice(0, 10)} ${snoozeDate.toISOString().slice(11, 16)}`;
  const snoozeTag = ` **Snooze:** ${snoozeFormatted}`;

  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (actionRegex.test(lines[i])) {
      // Remove any existing Snooze tag first, then append new one
      lines[i] = lines[i].replace(/\s*\*\*Snooze:\*\*\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g, '');
      lines[i] = lines[i] + snoozeTag;
      found = true;
      break;
    }
  }

  if (!found) {
    return NextResponse.json({ error: `Action not found: ${action}` }, { status: 404 });
  }

  const updatedContent = lines.join('\n');
  fs.writeFileSync(filePath, updatedContent, 'utf-8');

  // Return the updated todo
  const { todos } = parseTodosFile(updatedContent);
  const todo = todos.find(t => t.action.trim().toLowerCase() === action.trim().toLowerCase());
  return NextResponse.json({ ok: true, agentId, todo });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const filePath = getWorkspacePath(agentId);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'No TO-DOS.md found for agent' }, { status: 404 });
  }

  const body = await req.json() as {
    action: string;
    completed: boolean;
    summary?: string;
  };

  const { action, summary } = body;
  if (!action) {
    return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Find and remove the todo block matching this action
  const escapedAction = action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const actionRegex = new RegExp(`^-\\s+\\*\\*${escapedAction}\\*\\*`);

  let blockStart = -1;
  let blockEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (actionRegex.test(lines[i])) {
      blockStart = i;
      blockEnd = i + 1;
      while (blockEnd < lines.length && (lines[blockEnd].match(/^\s+-/) || lines[blockEnd].trim() === '')) {
        if (lines[blockEnd].trim() === '' && blockEnd + 1 < lines.length && !lines[blockEnd + 1].match(/^\s+-/)) break;
        blockEnd++;
      }
      break;
    }
  }

  if (blockStart === -1) {
    return NextResponse.json({ error: `Action not found: ${action}` }, { status: 404 });
  }

  const removedLines = lines.splice(blockStart, blockEnd - blockStart);
  const removedBlock = removedLines.join('\n').trim();

  const now = new Date();
  const timestamp = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)}`;
  const completedEntry = `- **${action}** ✓ completed: ${timestamp}${summary ? ` — ${summary}` : ''}\n  > ${removedBlock.replace(/\n/g, '\n  > ')}`;

  const completedIdx = lines.findIndex(l => /^##\s+Completed/i.test(l));
  if (completedIdx >= 0) {
    lines.splice(completedIdx + 1, 0, '', completedEntry);
  } else {
    lines.push('', '## Completed', '', completedEntry);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return NextResponse.json({ ok: true, agentId, action, completedAt: timestamp });
}
