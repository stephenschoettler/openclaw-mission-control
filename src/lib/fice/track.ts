'use client';

// Stub track for Overwatch - no external analytics dep
export type TrackEvent = string;

export function track(_event: TrackEvent, _props?: Record<string, string | number | boolean>) {
  // no-op in Overwatch
}

export function trackDuration(_event: TrackEvent, _startTime: number, _props?: Record<string, string | number | boolean>) {
  // no-op in Overwatch
}
