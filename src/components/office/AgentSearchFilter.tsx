'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Agent } from './types';

interface AgentSearchFilterProps {
  agents: Agent[];
  onFilterChange: (filtered: Agent[]) => void;
  theme: any;
  isMobile: boolean;
}

export function AgentSearchFilter({
  agents,
  onFilterChange,
  theme,
  isMobile,
}: AgentSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'idle'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fuzzy match helper
  const fuzzyMatch = (query: string, text: string): boolean => {
    if (!text) return false;
    const q = query.toLowerCase().trim();
    const t = text.toLowerCase();
    return t.includes(q);
  };

  // Filter logic
  useEffect(() => {
    let filtered = [...agents];

    // Status filter
    if (statusFilter === 'working') {
      filtered = filtered.filter(a => a.status === 'working');
    } else if (statusFilter === 'idle') {
      filtered = filtered.filter(a => a.status === 'idle');
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(a =>
        fuzzyMatch(searchQuery, a.name || a.id) ||
        fuzzyMatch(searchQuery, a.role || '') ||
        fuzzyMatch(searchQuery, a.id)
      );
    }

    onFilterChange(filtered);
  }, [searchQuery, statusFilter, agents, onFilterChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" to focus search
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // "Esc" to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
      // Ctrl+1/2/3 for status filters
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setStatusFilter('all');
        } else if (e.key === '2') {
          e.preventDefault();
          setStatusFilter('working');
        } else if (e.key === '3') {
          e.preventDefault();
          setStatusFilter('idle');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const buttonStyle = (isActive: boolean) => ({
    background: isActive ? 'rgba(0,255,65,0.2)' : 'rgba(0,0,0,0.3)',
    border: `1px solid ${isActive ? '#00ff41' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 6,
    color: isActive ? '#00ff41' : theme.textMuted,
    padding: isMobile ? '6px 10px' : '8px 12px',
    fontSize: isMobile ? 9 : 10,
    fontFamily: '"Press Start 2P", monospace',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textShadow: isActive ? '0 0 8px #00ff41' : 'none',
    boxShadow: isActive ? '0 0 12px rgba(0,255,65,0.3)' : 'none',
  });

  return (
    <div style={{
      background: theme.bgSecondary,
      borderBottom: `1px solid ${theme.border}`,
      padding: isMobile ? '8px 12px' : '12px 16px',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? 8 : 12,
    }}>
      {/* Search input */}
      <div style={{
        position: 'relative',
        flex: 1,
        minWidth: isMobile ? '100%' : 200,
      }}>
        <span style={{
          position: 'absolute',
          left: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12,
          pointerEvents: 'none',
        }}>
          🔍
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isMobile ? 'Search...' : 'Search agents... (press / to focus)'}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${searchQuery ? '#00ff41' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 6,
            padding: isMobile ? '8px 12px 8px 32px' : '10px 14px 10px 36px',
            color: '#fff',
            fontSize: isMobile ? 11 : 12,
            fontFamily: '"Courier New", monospace',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: searchQuery ? '0 0 12px rgba(0,255,65,0.2)' : 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00ff41';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0,255,65,0.3)';
          }}
          onBlur={(e) => {
            if (!searchQuery) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,0,0,0.2)',
              border: '1px solid rgba(255,0,0,0.3)',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ff4444',
              fontSize: 12,
              padding: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,0,0,0.2)';
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Status filters */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setStatusFilter('all')}
          style={buttonStyle(statusFilter === 'all')}
          onMouseEnter={(e) => {
            if (statusFilter !== 'all') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (statusFilter !== 'all') {
              e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
            }
          }}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('working')}
          style={buttonStyle(statusFilter === 'working')}
          onMouseEnter={(e) => {
            if (statusFilter !== 'working') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (statusFilter !== 'working') {
              e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
            }
          }}
        >
          🟢 Working
        </button>
        <button
          onClick={() => setStatusFilter('idle')}
          style={buttonStyle(statusFilter === 'idle')}
          onMouseEnter={(e) => {
            if (statusFilter !== 'idle') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (statusFilter !== 'idle') {
              e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
            }
          }}
        >
          ☕ Idle
        </button>
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== 'all') && (
        <div style={{
          fontSize: isMobile ? 8 : 9,
          color: theme.textMuted,
          fontFamily: '"Press Start 2P", monospace',
          whiteSpace: 'nowrap',
        }}>
          {agents.filter(a => {
            let match = true;
            if (statusFilter === 'working') match = a.status === 'working';
            if (statusFilter === 'idle') match = a.status === 'idle';
            if (searchQuery.trim() && match) {
              match = fuzzyMatch(searchQuery, a.name || a.id) ||
                      fuzzyMatch(searchQuery, a.role || '') ||
                      fuzzyMatch(searchQuery, a.id);
            }
            return match;
          }).length} / {agents.length}
        </div>
      )}
    </div>
  );
}
