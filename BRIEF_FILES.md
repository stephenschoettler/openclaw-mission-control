# Task: Build File Explorer — Replace Memory Page

## Overview
Replace the existing Memory page with a full File Explorer page. The Files page absorbs Memory's functionality and adds full workspace browsing, upload, delete, and inline markdown editing.

---

## 1. Delete the old Memory page
- Delete `src/app/memory/` directory entirely
- Delete `src/app/api/memory/` directory entirely

---

## 2. Update `src/app/layout.tsx`
- Remove Memory nav item (`{ href: '/memory', label: 'Memory', icon: Brain }`)
- Add Files nav item in its place: `{ href: '/files', label: 'Files', icon: FolderOpen }`
- Import `FolderOpen` from lucide-react (remove `Brain` if no longer used)

---

## 3. Create API route: `src/app/api/files/route.ts`

Handles GET (list dir), POST (upload), DELETE (delete file).

**Allowed roots** (whitelist — reject anything outside these):
```
/home/w0lf/.openclaw/workspace
/home/w0lf/.openclaw/workspace-answring
/home/w0lf/.openclaw/workspace-answring-dev
/home/w0lf/.openclaw/workspace-answring-marketing
/home/w0lf/.openclaw/workspace-answring-ops
/home/w0lf/.openclaw/workspace-answring-sales
/home/w0lf/.openclaw/workspace-answring-security
/home/w0lf/.openclaw/workspace-answring-strategist
/home/w0lf/.openclaw/workspace-browser
/home/w0lf/.openclaw/workspace-comms
/home/w0lf/.openclaw/workspace-dad
/home/w0lf/.openclaw/workspace-dev
/home/w0lf/.openclaw/workspace-dev-backend
/home/w0lf/.openclaw/workspace-dev-devops
/home/w0lf/.openclaw/workspace-dev-frontend
/home/w0lf/.openclaw/workspace-hustle
/home/w0lf/.openclaw/workspace-main
/home/w0lf/.openclaw/workspace-pop
/home/w0lf/.openclaw/workspace-ralph
/home/w0lf/.openclaw/workspace-tldr
/home/w0lf/.openclaw/memory
/home/w0lf/.openclaw/cron
/home/w0lf/mission-control/src
```

**Security rules:**
- Resolve the requested path with `path.resolve()`
- Check that it starts with one of the allowed roots
- Reject any path containing `..` segments before resolving
- Return 403 if not allowed

**GET /api/files?path=<dir>**
- Lists a directory: returns JSON array of `{ name, path, type: 'file'|'dir', size, modified, ext }`
- `ext` is file extension lowercase (e.g. `md`, `json`, `ts`) or empty string for dirs
- Sort: directories first, then files, both alphabetically

**POST /api/files/upload** — handle via multipart form (use `request.formData()`)
- Fields: `path` (target directory), `file` (the uploaded file blob)
- Max 10MB
- Save file to `<path>/<filename>`
- Return `{ success: true, path: savedPath }`

**DELETE /api/files?path=<file>**
- Delete a file (not dirs — return 400 if it's a directory)
- Return `{ success: true }`

---

## 4. Create API route: `src/app/api/files/content/route.ts`

**GET /api/files/content?path=<file>**
- Read file content as UTF-8 text (max 100KB — truncate with notice if larger)
- Reject binary files: check extension against allowed text types: `md`, `txt`, `json`, `ts`, `tsx`, `js`, `jsx`, `py`, `sh`, `yaml`, `yml`, `toml`, `env`, `csv`, `html`, `css`, `xml`, `log`, `conf`, `ini`, `gitignore`, `lock`
- Same path security check as above
- Return `{ content: string, truncated: boolean }`

**PUT /api/files/content**
- Body: `{ path: string, content: string }`
- Write content to file (UTF-8)
- Same security check
- Return `{ success: true }`

---

## 5. Create `src/app/files/page.tsx`

Full file explorer page. Use the existing dark theme (`bg-neutral-900`, `bg-neutral-800`, `border-neutral-700/50`, `gradient-text` class for titles).

### Layout
Three-panel layout (on desktop):
- **Left panel** (~240px): workspace tree
- **Center panel** (flex-1): file list for current directory
- **Right panel** (~400px, slides in): file preview / editor

On mobile: stack vertically, hide panels not in focus.

### Left panel — Workspace Tree
Show all agent workspaces as root folders with friendly names:

```
~/.openclaw/workspace          → "Main"
~/.openclaw/workspace-main     → "Main (alt)"
~/.openclaw/workspace-dev      → "Code Monkey"
~/.openclaw/workspace-dev-backend   → "Code Backend"
~/.openclaw/workspace-dev-devops    → "Code DevOps"
~/.openclaw/workspace-dev-frontend  → "Code Frontend"
~/.openclaw/workspace-ralph    → "Ralph"
~/.openclaw/workspace-comms    → "Comms"
~/.openclaw/workspace-hustle   → "Hustle"
~/.openclaw/workspace-pop      → "Pop"
~/.openclaw/workspace-dad      → "Dad"
~/.openclaw/workspace-tldr     → "TLDR"
~/.openclaw/workspace-browser  → "Browser"
~/.openclaw/workspace-answring → "Answring"
~/.openclaw/workspace-answring-dev → "Answring Dev"
~/.openclaw/workspace-answring-marketing → "Answring Marketing"
~/.openclaw/workspace-answring-ops → "Answring Ops"
~/.openclaw/workspace-answring-sales → "Answring Sales"
~/.openclaw/workspace-answring-security → "Answring Security"
~/.openclaw/workspace-answring-strategist → "Answring Strategist"
~/.openclaw/memory             → "Memory"
~/.openclaw/cron               → "Cron Jobs"
~/mission-control/src          → "Mission Control"
```

**Default:** on load, set current path to `/home/w0lf/.openclaw/memory` (Memory workspace, so the page lands where Memory used to be).

Clicking a workspace root navigates to it. Show which root is active (highlighted).

### Center panel — File List
- Breadcrumb trail at top showing current path (clickable segments to navigate up)
- "Upload" button (top right of panel) — opens hidden file input, uploads to current dir
- File/dir rows showing: icon (folder or file-type icon), name, size, modified date
- Clicking a directory → navigate into it (update path, refetch listing)
- Clicking a file → open preview panel
- Each file row has a delete button (trash icon, hover to show) — confirm before deleting
- Show loading state while fetching

### Right panel — Preview / Editor
Slides in when a file is selected (or replaces center panel on mobile).

**For `.md` files:**
- Show a toggle: "Preview" | "Edit" (default: Preview)
- Preview mode: render markdown as formatted HTML using `ReactMarkdown` (already installed)
  - Style it nicely: prose-like, headings visible, code blocks highlighted
- Edit mode: `<textarea>` with monospace font, full content, auto-resizing
  - "Save" button → PUT /api/files/content
  - "Cancel" → switch back to preview without saving
  - Show "Saving..." state, then "Saved ✓" briefly

**For other text files:**
- Show raw content in a `<pre>` block with scroll
- No edit mode for non-md files

**For binary/unknown:**
- Show file metadata: name, size, modified, type
- "Cannot preview binary file" message

Close button (X) to dismiss panel.

---

## 6. Styling notes
- Match existing dark theme throughout
- Use `gradient-text` class for the "Files" page title
- Icons from `lucide-react` — FolderOpen, File, FileText, Trash2, Upload, ChevronRight, X, Edit3, Eye
- Subtle hover states on rows: `hover:bg-neutral-800`
- Selected file row: `bg-neutral-800`
- Panel borders: `border-neutral-700/50`

---

## 7. Build & verify
After all changes:
```bash
cd ~/mission-control && npm run build
```
Must pass with zero errors. Fix any TypeScript errors.

Then restart the service:
```bash
systemctl --user restart mission-control
```

When done, notify:
```bash
~/.npm-packages/bin/openclaw system event --text "Done: File Explorer page built — replaces Memory in Mission Control" --mode now
```
