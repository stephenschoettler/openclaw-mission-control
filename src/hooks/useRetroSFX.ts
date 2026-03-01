// Stub - no retro SFX in Overwatch
export function useRetroSFX() {
  return {
    play: (_sound: string, _delay?: number) => {},
    npcClick: () => {},
    questComplete: () => {},
    achievement: () => {},
    error: () => {},
    swoosh: () => {},
    ding: () => {},
    setEnabled: (_enabled: boolean) => {},
    enabled: false,
  };
}
