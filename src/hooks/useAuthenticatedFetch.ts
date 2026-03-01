import { useCallback } from 'react';

// In MC, auth is handled by session cookie at middleware level
// No extra headers needed for API calls within MC
export function useAuthenticatedFetch() {
  const authenticatedFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    return fetch(url, options);
  }, []);

  return authenticatedFetch;
}
