import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const WORKSPACE_MAP: Record<string, string> = {
  'workspace':              'main',
  'workspace-dev':          'code-monkey',
  'workspace-dev-backend':  'code-backend',
  'workspace-dev-frontend': 'code-frontend',
  'workspace-dev-security': 'code-security',
  'workspace-dev-docs':     'code-docs',
  'workspace-ralph':        'ralph',
  'workspace-pixel':        'pixel',
};

function workspaceDirToAgentId(dirName: string): string {
  return WORKSPACE_MAP[dirName] || dirName;
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

interface ParseResult {
  todos: TodoItem[];
  completed: CompletedItem[];
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

function parsePriority(line: string): 1 | 2 | 3 {
  if (/\*\*P1\*\*/.test(line)) return 1;
  if (/\*\*P2\*\*/.test(line)) return 2;
  return 3;
}

function parseTodosFile(content: string): ParseResult {
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
      flushTodo();
      inSection = false;
      inCompleted = true;
      continue;
    }

    if (inCompleted) {
      const completedMatch = line.match(/^-\s+\*\*(.+?)\*\*.*✓\s*completed:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (completedMatch) {
        completed.push({ action: completedMatch[1].trim(), completedAt: completedMatch[2].trim() });
      }
      continue;
    }

    const headingMatch = line.match(/^##\s+(.+?)\s*-\s*(.+)$/);
    if (headingMatch) {
      flushTodo();
      currentTitle = headingMatch[1].trim();
      currentDate = headingMatch[2].trim();
      resetCurrent();
      inSection = true;
      continue;
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
        if (probMatch) currentProblem = probMatch[1].trim();
        else currentProblem = rest;
        if (filesMatch) currentFiles = filesMatch[1].trim();
        if (solMatch) currentSolution = solMatch[1].trim();
      }
      continue;
    }

    const subMatch = line.match(/^\s+-\s+\*\*(Problem|Files?|Solution|Issue|Task|Note|Assignee|PR|Snooze)\*\*[:\s]+(.+)$/i);
    if (subMatch) {
      const key = subMatch[1].toLowerCase();
      const val = subMatch[2].trim();
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

  todos.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.date.localeCompare(b.date);
  });

  return { todos, completed };
}

export async function GET() {
  const home = process.env.HOME || '/home/w0lf';
  const ocDir = path.join(home, '.openclaw');

  const patterns = [
    path.join(ocDir, 'workspace-*/TO-DOS.md'),
    path.join(ocDir, 'workspace/TO-DOS.md'),
  ];

  const allFiles: string[] = [];
  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern);
      allFiles.push(...matches);
    } catch {
      // ignore
    }
  }

  const agents = [];

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { todos, completed } = parseTodosFile(content);
      if (todos.length === 0 && completed.length === 0) continue;

      const workspaceDir = path.basename(path.dirname(filePath));
      const agentId = workspaceDirToAgentId(workspaceDir);

      agents.push({
        agentId,
        todos,
        completed,
      });
    } catch {
      // skip unreadable files
    }
  }

  return NextResponse.json({ agents });
}
