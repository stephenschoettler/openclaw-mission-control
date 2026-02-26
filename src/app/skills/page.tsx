'use client';

import { useState, useEffect } from 'react';
import { Puzzle, Terminal, X, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Skill {
  name: string;
  displayName: string;
  description: string;
  hasScripts: boolean;
  content: string;
}

function SkillCard({ skill }: { skill: Skill }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer group
        ${expanded
          ? 'border-indigo-500/40 bg-indigo-500/[0.06] col-span-full'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-indigo-500/30 hover:bg-white/[0.05]'}
      `}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Card Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${expanded ? 'bg-indigo-500/20' : 'bg-white/[0.05] group-hover:bg-indigo-500/10'} transition-colors`}>
            <Puzzle size={15} className={expanded ? 'text-indigo-300' : 'text-neutral-500 group-hover:text-indigo-400'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">{skill.displayName}</h3>
              {skill.hasScripts && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <Terminal size={9} />
                  executable
                </span>
              )}
            </div>
            {skill.description && (
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-2">{skill.description}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded
            ? <ChevronUp size={14} className="text-indigo-400" />
            : <ChevronDown size={14} className="text-neutral-600 group-hover:text-neutral-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div
          className="border-t border-white/[0.06] px-6 py-5"
          onClick={e => e.stopPropagation()}
        >
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-headings:font-semibold
            prose-p:text-neutral-300 prose-p:leading-relaxed
            prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
            prose-code:text-indigo-300 prose-code:bg-white/[0.08] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
            prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/[0.08] prose-pre:rounded-lg
            prose-strong:text-white
            prose-li:text-neutral-300
            prose-table:text-sm
            prose-th:text-neutral-300 prose-th:font-semibold
            prose-td:text-neutral-400
            prose-hr:border-white/10
          ">
            <ReactMarkdown>{skill.content}</ReactMarkdown>
          </div>
          <button
            className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
            onClick={() => setExpanded(false)}
          >
            <X size={11} /> Collapse
          </button>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/skills')
      .then(r => r.json())
      .then(data => { setSkills(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = skills.filter(s =>
    s.displayName.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const executableCount = skills.filter(s => s.hasScripts).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Puzzle size={18} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Skills</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Installed OpenClaw skills
              {!loading && (
                <> · <span className="text-neutral-400">{skills.length} total</span>
                {executableCount > 0 && <>, <span className="text-emerald-500">{executableCount} executable</span></>}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search skills…"
          className="w-full pl-3 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-600 outline-none focus:border-indigo-500/60 transition-colors"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <Puzzle size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{search ? 'No skills match your search' : 'No skills found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(skill => (
            <SkillCard key={skill.name} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
