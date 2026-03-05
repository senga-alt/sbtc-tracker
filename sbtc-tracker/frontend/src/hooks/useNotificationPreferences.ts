import { useState, useCallback } from 'react';

export interface NotificationPreferences {
  priceAlerts: boolean;
  transactionAlerts: boolean;
  pushNotifications: boolean;
  priceThreshold: number; // percentage, e.g. 5
}

const STORAGE_KEY = 'notification-preferences';

const DEFAULTS: NotificationPreferences = {
  priceAlerts: true,
  transactionAlerts: true,
  pushNotifications: false,
  priceThreshold: 5,
};

function load(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(load);

  const update = useCallback((patch: Partial<NotificationPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { prefs, update };
}

/** Read-only helper for hooks that just need current prefs without reactivity */
export function getNotificationPreferences(): NotificationPreferences {
  return load();
}
