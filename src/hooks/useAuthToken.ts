import { useState } from 'react';

// In MC, auth is cookie-based - no token needed for API calls
export function useAuthToken(): string | null {
  const [token] = useState<string | null>(null);
  return token;
}
