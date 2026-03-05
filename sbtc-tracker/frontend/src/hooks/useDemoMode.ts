import { useState, useEffect, useCallback } from 'react';

const KEY = 'demoMode';

export function useDemoMode() {
  const [demoMode, setDemoModeState] = useState(() => localStorage.getItem(KEY) === 'true');

  const setDemoMode = useCallback((val: boolean) => {
    localStorage.setItem(KEY, String(val));
    setDemoModeState(val);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: String(val) }));
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setDemoModeState(e.newValue === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { demoMode, setDemoMode };
}
