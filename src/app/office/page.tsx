'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';

interface OfficeStation {
  id: number;
  agent_id: string;
  agent_name: string;
  role: string;
  current_task: string;
  status: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
  model?: string;
}

// Sub-agents hidden unless actively working
const SUB_AGENT_IDS = new Set([
  'code-frontend', 'code-backend', 'code-devops',
  'answring-ops', 'answring-dev', 'answring-marketing',
  'answring-security', 'answring-strategist', 'answring-sales',
]);

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

/** Resolve display status — stale "working" (>10 min) → "idle" */
function resolveStatus(status: string, updatedAt: string): string {
  if (status !== 'working') return status;
  const ageMs = Date.now() - parseUtc(updatedAt).getTime();
  return ageMs > 10 * 60 * 1000 ? 'idle' : 'working';
}

// Agent metadata
const AGENT_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  babbage:          { emoji: '🧠', color: '#818cf8', label: 'Babbage' },
  'code-monkey':    { emoji: '🐒', color: '#fb923c', label: 'Code Monkey' },
  'code-frontend':  { emoji: '🖥️', color: '#fb923c', label: 'Frontend' },
  'code-backend':   { emoji: '⚙️', color: '#fb923c', label: 'Backend' },
  'code-devops':    { emoji: '🚀', color: '#fb923c', label: 'DevOps' },
  ralph:            { emoji: '🔍', color: '#f472b6', label: 'Ralph' },
  hustle:           { emoji: '💼', color: '#34d399', label: 'Hustle' },
  'answring-manager': { emoji: '📞', color: '#60a5fa', label: 'Answring Mgr' },
  'answring-ops':   { emoji: '📞', color: '#60a5fa', label: 'Ops' },
  tldr:             { emoji: '📋', color: '#a78bfa', label: 'TLDR' },
  roadie:           { emoji: '🛣️', color: '#fbbf24', label: 'Roadie' },
  browser:          { emoji: '🌐', color: '#22d3ee', label: 'Browser' },
  comms:            { emoji: '✉️', color: '#f87171', label: 'Comms' },
};

function getAgentConfig(agentId: string, agentName: string) {
  const key = agentId.toLowerCase();
  if (AGENT_CONFIG[key]) return AGENT_CONFIG[key];
  // fuzzy match by name
  for (const [k, v] of Object.entries(AGENT_CONFIG)) {
    if (agentName.toLowerCase().includes(k) || k.includes(agentName.toLowerCase())) return v;
  }
  return { emoji: agentName[0]?.toUpperCase() || '?', color: '#9ca3af', label: agentName };
}

// Fixed desk positions (x, y as % of 1000x700 container)
// Each agent has a fixed slot; sub-agents float near code-monkey / answring
const DESK_POSITIONS: Record<string, { x: number; y: number; boss?: boolean }> = {
  babbage:            { x: 430, y: 30,  boss: true },
  tldr:               { x: 780, y: 30 },
  comms:              { x: 80,  y: 200 },
  'code-monkey':      { x: 80,  y: 340 },
  'code-frontend':    { x: 80,  y: 460 },
  'code-backend':     { x: 80,  y: 540 },
  'code-devops':      { x: 80,  y: 620 },
  browser:            { x: 780, y: 240 },
  ralph:              { x: 780, y: 360 },
  hustle:             { x: 780, y: 480 },
  roadie:             { x: 780, y: 600 },
  'answring-manager': { x: 290, y: 570 },
  'answring-ops':     { x: 170, y: 570 },
};

// Fallback positions for unknown agents (scatter near center-bottom)
function fallbackPosition(index: number): { x: number; y: number } {
  return { x: 300 + (index % 4) * 80, y: 400 + Math.floor(index / 4) * 80 };
}

interface DeskProps {
  station: OfficeStation & { displayStatus: string };
  x: number;
  y: number;
  boss?: boolean;
}

function Desk({ station, x, y, boss }: DeskProps) {
  const [hovered, setHovered] = useState(false);
  const cfg = getAgentConfig(station.agent_id, station.agent_name);
  const isWorking = station.displayStatus === 'working';
  const isIdle = !isWorking;

  const deskW = boss ? 80 : 60;
  const deskH = boss ? 52 : 40;
  const monW = boss ? 44 : 32;
  const monH = boss ? 12 : 8;

  const taskLabel = station.current_task
    ? station.current_task.slice(0, 30) + (station.current_task.length > 30 ? '…' : '')
    : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'default',
        zIndex: hovered ? 20 : 1,
        opacity: isIdle ? 0.55 : 1,
        transition: 'opacity 0.3s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Emoji avatar */}
      <div style={{ fontSize: boss ? 26 : 20, lineHeight: 1, marginBottom: 3, filter: isIdle ? 'grayscale(60%)' : 'none' }}>
        {cfg.emoji}
      </div>

      {/* Desk body */}
      <div
        style={{
          width: deskW,
          height: deskH,
          backgroundColor: '#8B6914',
          border: `2px solid ${isWorking ? cfg.color : '#5a4210'}`,
          borderRadius: 3,
          position: 'relative',
          boxShadow: isWorking ? `0 0 10px ${cfg.color}88, 0 0 3px ${cfg.color}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Monitor */}
        <div
          style={{
            width: monW,
            height: monH,
            backgroundColor: isWorking ? '#60a5fa' : '#1e3a5f',
            border: '1px solid #1d4ed8',
            borderRadius: 1,
            boxShadow: isWorking ? '0 0 6px #60a5faaa' : 'none',
          }}
        />
        {/* Desk surface lines */}
        <div style={{ width: deskW - 8, height: 2, backgroundColor: '#6b5011', borderRadius: 1 }} />
      </div>

      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: isWorking ? '#4ade80' : '#6b7280',
            boxShadow: isWorking ? '0 0 6px #4ade80' : 'none',
          }}
          className={isWorking ? 'pulse-dot' : ''}
        />
        {/* Agent name */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            textShadow: `0 0 6px ${cfg.color}66`,
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Task tooltip */}
      {hovered && isWorking && taskLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            backgroundColor: '#000',
            border: `1px solid ${cfg.color}66`,
            borderRadius: 4,
            padding: '4px 8px',
            whiteSpace: 'nowrap',
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 9, color: '#e5e7eb' }}>{taskLabel}</span>
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${cfg.color}66`,
          }} />
        </div>
      )}
    </div>
  );
}

export default function OfficePage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const fetchData = useCallback(async () => {
    const [stRes, agRes] = await Promise.all([fetch('/api/office'), fetch('/api/agents')]);
    const stationData: OfficeStation[] = await stRes.json();
    const agentData: Agent[] = await agRes.json();
    setAgents(agentData);

    for (const agent of agentData) {
      if (!stationData.find(s => s.agent_id === agent.id)) {
        await fetch('/api/office', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.id, agent_name: agent.name, role: agent.model || '', status: 'idle' })
        });
      }
    }

    if (agentData.length > stationData.length) {
      const res = await fetch('/api/office');
      setStations(await res.json());
    } else {
      setStations(stationData);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, 15000); return () => clearInterval(id); }, [fetchData]);

  const resolvedStations = stations.map(s => ({
    ...s,
    displayStatus: resolveStatus(s.status, s.updated_at),
  }));

  const visibleStations = resolvedStations.filter(s =>
    !SUB_AGENT_IDS.has(s.agent_id) || s.displayStatus === 'working'
  );
  const hiddenSubAgents = resolvedStations.filter(s =>
    SUB_AGENT_IDS.has(s.agent_id) && s.displayStatus !== 'working'
  );

  const workingCount = visibleStations.filter(s => s.displayStatus === 'working').length;
  const idleCount = visibleStations.filter(s => s.displayStatus === 'idle').length;

  // Assign positions
  let fallbackIdx = 0;
  const stationsWithPos = visibleStations.map(s => {
    const pos = DESK_POSITIONS[s.agent_id.toLowerCase()] || fallbackPosition(fallbackIdx++);
    return { ...s, ...pos };
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
            <Building2 size={16} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">The Office</h2>
            <p className="text-xs text-neutral-500">Pixel floor plan — hover active desks for current task</p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-[10px] text-neutral-500">Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-neutral-600" />
            <span className="text-[10px] text-neutral-500">Idle</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-green-400">{workingCount}</span>
          <span className="text-xs text-neutral-500">Working</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-neutral-400">{idleCount}</span>
          <span className="text-xs text-neutral-500">Idle</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white">{visibleStations.length}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
        {hiddenSubAgents.length > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-neutral-600">{hiddenSubAgents.length}</span>
            <span className="text-xs text-neutral-700">Workers idle</span>
          </div>
        )}
      </div>

      {/* Floor Plan Room */}
      <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
        <div
          style={{
            position: 'relative',
            width: 1000,
            height: 700,
            // Checkered dark grid background
            backgroundImage: `
              linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
              linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
            backgroundColor: '#1e1e1e',
            border: '2px solid #3a3a3a',
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          {/* Room walls / floor border */}
          <div style={{
            position: 'absolute', inset: 4,
            border: '2px solid #3d3d3d',
            borderRadius: 6,
            pointerEvents: 'none',
          }} />

          {/* Zone labels */}
          <div style={{ position: 'absolute', left: 16, top: 160, fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dev Zone</div>
          <div style={{ position: 'absolute', right: 16, top: 160, fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>QA / Ops</div>
          <div style={{ position: 'absolute', left: 240, bottom: 20, fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Answring Corner</div>

          {/* Conference table — oval in center */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 220,
            height: 110,
            backgroundColor: '#6b4c11',
            border: '3px solid #8B6914',
            borderRadius: '50%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {/* Chairs around table */}
            {[
              { left: '50%', top: -14, transform: 'translateX(-50%)' },
              { left: '50%', bottom: -14, transform: 'translateX(-50%)' },
              { left: -10, top: '50%', transform: 'translateY(-50%)' },
              { right: -10, top: '50%', transform: 'translateY(-50%)' },
              { left: '25%', top: -12, transform: 'translateX(-50%)' },
              { left: '75%', top: -12, transform: 'translateX(-50%)' },
              { left: '25%', bottom: -12, transform: 'translateX(-50%)' },
              { left: '75%', bottom: -12, transform: 'translateX(-50%)' },
            ].map((s, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 14,
                height: 10,
                backgroundColor: '#4a3510',
                border: '1px solid #6b4c11',
                borderRadius: 3,
                ...s,
              }} />
            ))}
            <div style={{ textAlign: 'center', lineHeight: '104px', fontSize: 10, color: '#8B6914', fontWeight: 700, letterSpacing: '0.08em' }}>CONF ROOM</div>
          </div>

          {/* Plant — bottom left */}
          <div style={{
            position: 'absolute', left: 30, bottom: 30,
            width: 48, height: 48,
            backgroundColor: '#166534',
            border: '3px solid #15803d',
            borderRadius: '50%',
            boxShadow: '0 0 8px #15803d44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🌿</div>

          {/* Plant — bottom right */}
          <div style={{
            position: 'absolute', right: 30, bottom: 30,
            width: 48, height: 48,
            backgroundColor: '#166534',
            border: '3px solid #15803d',
            borderRadius: '50%',
            boxShadow: '0 0 8px #15803d44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🌿</div>

          {/* Boss nameplate above Babbage desk */}
          <div style={{
            position: 'absolute',
            left: 430,
            top: 10,
            transform: 'translateX(-50%)',
            fontSize: 8,
            color: '#818cf8',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textShadow: '0 0 8px #818cf8',
          }}>
            — DIRECTOR —
          </div>

          {/* Render desks */}
          {stationsWithPos.map(s => (
            <Desk
              key={s.agent_id}
              station={s}
              x={s.x}
              y={s.y}
              boss={s.agent_id === 'babbage'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
