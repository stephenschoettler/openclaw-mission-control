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
}

interface CompletedItem {
  action: string;
  completedAt: string;
}

interface ParseResult {
  todos: TodoItem[];
  completed: CompletedItem[];
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
  let inSection = false;
  let inCompleted = false;

  const flushTodo = () => {
    if (inSection && currentAction) {
      todos.push({
        title: currentTitle,
        date: currentDate,
        action: currentAction,
        problem: currentProblem,
        files: currentFiles,
        solution: currentSolution,
      });
    }
  };

  for (const line of lines) {
    // Completed section
    if (line.match(/^##\s+Completed/i)) {
      flushTodo();
      inSection = false;
      inCompleted = true;
      continue;
    }

    // Parse completed items: - **action** ✓ completed: YYYY-MM-DD HH:MM
    if (inCompleted) {
      const completedMatch = line.match(/^-\s+\*\*(.+?)\*\*.*✓\s*completed:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (completedMatch) {
        completed.push({ action: completedMatch[1].trim(), completedAt: completedMatch[2].trim() });
      }
      continue;
    }

    // Match ## Title - Date headings
    const headingMatch = line.match(/^##\s+(.+?)\s*-\s*(.+)$/);
    if (headingMatch) {
      flushTodo();
      currentTitle = headingMatch[1].trim();
      currentDate = headingMatch[2].trim();
      currentAction = '';
      currentProblem = '';
      currentFiles = '';
      currentSolution = '';
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    // If this heading is 'Completed', mark and skip items
    if (currentTitle.toLowerCase() === 'completed') { inCompleted = true; continue; }

    // Match - **action** list items
    const actionMatch = line.match(/^-\s+\*\*(.+?)\*\*/);
    if (actionMatch) {
      if (currentAction) {
        flushTodo();
        currentAction = '';
        currentProblem = '';
        currentFiles = '';
        currentSolution = '';
      }
      currentAction = actionMatch[1].trim();

      const rest = line.replace(/^-\s+\*\*.+?\*\*/, '').replace(/^[\s:—–-]+/, '').trim();
      if (rest) {
        const probMatch = rest.match(/\*\*Problem:\*\*\s*([^*]+?)(?=\s*\*\*(?:Files?|Solution):|$)/i);
        const filesMatch = rest.match(/\*\*Files?:\*\*\s*([^*]+?)(?=\s*\*\*(?:Problem|Solution):|$)/i);
        const solMatch = rest.match(/\*\*Solution:\*\*\s*([^*]+?)(?=\s*\*\*(?:Problem|Files?):|$)/i);
        if (probMatch) currentProblem = probMatch[1].trim();
        else currentProblem = rest;
        if (filesMatch) currentFiles = filesMatch[1].trim();
        if (solMatch) currentSolution = solMatch[1].trim();
      }
      continue;
    }

    const subMatch = line.match(/^\s+-\s+\*\*(Problem|Files?|Solution|Issue|Task|Note)\*\*[:\s]+(.+)$/i);
    if (subMatch) {
      const key = subMatch[1].toLowerCase();
      const val = subMatch[2].trim();
      if (key === 'problem' || key === 'issue') currentProblem = val;
      else if (key.startsWith('file')) currentFiles = val;
      else if (key === 'solution') currentSolution = val;
      else if (key === 'task' || key === 'note') currentProblem = val;
    }
  }

  flushTodo();
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
