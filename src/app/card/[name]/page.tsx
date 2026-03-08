'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

const AGENTS: Record<string, { name: string; emoji: string; role: string; rarity: string; color: string; level: number }> = {
  'babbage':       { name: 'Babbage',        emoji: '🦞', role: 'Chief of Staff',        rarity: '◆ LEGENDARY', color: '#f59e0b', level: 99 },
  'code-monkey':   { name: 'Code Monkey',     emoji: '🐒', role: 'Engineering Manager',   rarity: '◆ EPIC',      color: '#a855f7', level: 42 },
  'answring':      { name: 'Maya',            emoji: '📞', role: 'Answring Ops Lead',     rarity: '◆ EPIC',      color: '#3b82f6', level: 35 },
  'hustle':        { name: 'Hustle',          emoji: '💼', role: 'Business Development',  rarity: '● RARE',      color: '#10b981', level: 28 },
  'roadie':        { name: 'Roadie',          emoji: '🎸', role: 'Content & Creative',    rarity: '● RARE',      color: '#f59e0b', level: 22 },
  'ralph':         { name: 'Ralph',           emoji: '✅', role: 'Fleet QA Reviewer',     rarity: '● RARE',      color: '#22c55e', level: 20 },
  'tldr':          { name: 'Cliff',           emoji: '📰', role: 'News & Briefings',      rarity: '● RARE',      color: '#8b5cf6', level: 18 },
  'forge':         { name: 'Forge',           emoji: '⚒️',  role: 'Builder',              rarity: '● RARE',      color: '#f97316', level: 16 },
  'browser':       { name: 'Browser Agent',   emoji: '🌐', role: 'Web Research',          rarity: '◉ UNCOMMON',  color: '#06b6d4', level: 14 },
  'code-frontend': { name: 'Code Frontend',   emoji: '🎨', role: 'Frontend Engineer',     rarity: '◉ UNCOMMON',  color: '#f97316', level: 12 },
  'code-backend':  { name: 'Code Backend',    emoji: '⚙️',  role: 'Backend Engineer',     rarity: '◉ UNCOMMON',  color: '#f97316', level: 12 },
  'code-devops':   { name: 'Code DevOps',     emoji: '🔧', role: 'DevOps Engineer',       rarity: '◉ UNCOMMON',  color: '#f97316', level: 11 },
  'docs':          { name: 'The Professor',   emoji: '📚', role: 'Documentation',         rarity: '◉ UNCOMMON',  color: '#64748b', level: 10 },
};

export default function CardPage() {
  const { name } = useParams<{ name: string }>();
  const [imgFailed, setImgFailed] = useState(false);
  const agent = AGENTS[name];

  if (!agent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Press Start 2P", monospace',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 16 }}>Agent not found</p>
          <Link href="/cards" style={{ color: '#818cf8', fontSize: 10, textDecoration: 'none' }}>← Back to Cards</Link>
        </div>
      </div>
    );
  }

  const imgSrc = `/agents/${name}.png`;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: '"Press Start 2P", monospace',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          background: 'rgba(15,23,42,0.9)',
          border: `3px solid ${agent.color}`,
          borderRadius: 16,
          padding: 32,
          maxWidth: 320,
          margin: '0 auto',
          boxShadow: `0 0 60px ${agent.color}30, 0 0 120px ${agent.color}15`,
        }}>
          {/* Rarity badge */}
          <div style={{ color: agent.color, fontSize: 9, marginBottom: 16, letterSpacing: 2 }}>
            {agent.rarity}
          </div>

          {/* Avatar — try image, fallback to emoji */}
          <div style={{
            width: 120,
            height: 120,
            margin: '0 auto 20px',
            borderRadius: 16,
            background: `${agent.color}15`,
            border: `2px solid ${agent.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {imgFailed ? (
              <span style={{ fontSize: 72, lineHeight: 1 }}>{agent.emoji}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={agent.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImgFailed(true)}
              />
            )}
          </div>

          {/* Name & role */}
          <h1 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 6 }}>{agent.name}</h1>
          <p style={{ color: '#94a3b8', fontSize: 9, marginBottom: 20 }}>{agent.role}</p>

          {/* Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: `1px solid ${agent.color}30`,
            paddingTop: 16,
          }}>
            <div>
              <p style={{ color: '#64748b', fontSize: 7, marginBottom: 4 }}>LEVEL</p>
              <p style={{ color: agent.color, fontSize: 18, fontWeight: 'bold' }}>{agent.level}</p>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: 7, marginBottom: 4 }}>ID</p>
              <p style={{ color: '#94a3b8', fontSize: 10 }}>{name}</p>
            </div>
          </div>
        </div>

        <Link
          href="/cards"
          style={{
            display: 'inline-block',
            marginTop: 24,
            color: '#818cf8',
            fontSize: 10,
            textDecoration: 'none',
          }}
        >
          ← Back to Collection
        </Link>
      </div>
    </div>
  );
}
