import type { PriceAlert } from '@/types';

const STORAGE_KEY = 'price-alerts';

function notifyChange() {
  window.dispatchEvent(new CustomEvent('price-alerts-change'));
}

export function loadAlerts(): PriceAlert[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): PriceAlert | null {
  if (alert.targetPrice <= 0) return null;
  const entry: PriceAlert = {
    ...alert,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const alerts = loadAlerts();
  alerts.push(entry);
  saveAlerts(alerts);
  notifyChange();
  return entry;
}

export function removeAlert(id: string) {
  const alerts = loadAlerts().filter(a => a.id !== id);
  saveAlerts(alerts);
  notifyChange();
}

export function incrementFireCount(id: string) {
  const alerts = loadAlerts();
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.fireCount = (alert.fireCount || 0) + 1;
    saveAlerts(alerts);
    notifyChange();
  }
}

export function updateAlert(id: string, updates: Partial<Pick<PriceAlert, 'symbol' | 'direction' | 'targetPrice'>>) {
  const alerts = loadAlerts();
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    Object.assign(alert, updates);
    saveAlerts(alerts);
    notifyChange();
  }
}

export function resetFireCount(id: string) {
  const alerts = loadAlerts();
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.fireCount = 0;
    saveAlerts(alerts);
    notifyChange();
  }
}
