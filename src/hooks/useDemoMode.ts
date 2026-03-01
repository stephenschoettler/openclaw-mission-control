import { useCallback } from 'react';

// In MC, there's no demo mode - always live
export function useDemoMode() {
  const isDemoMode = false;

  const getApiPath = useCallback((path: string) => {
    // Remap /api/office to /api/office-view for fice's main data endpoint
    if (path === '/api/office') return '/api/office-view';
    return path;
  }, []);

  return { isDemoMode, getApiPath };
}
