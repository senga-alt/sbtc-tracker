export interface NotificationEntry {
  id: string;
  type: 'price' | 'transaction';
  message: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = 'notification-history';
const MAX_ENTRIES = 100;

function notifyChange() {
  window.dispatchEvent(new CustomEvent('notification-change'));
}

function load(): NotificationEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(entries: NotificationEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addNotification(type: NotificationEntry['type'], message: string) {
  const entries = load();
  entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  });
  save(entries.slice(0, MAX_ENTRIES));
  notifyChange();
}

export function getNotifications(): NotificationEntry[] {
  return load();
}

export function getUnreadCount(): number {
  return load().filter(n => !n.read).length;
}

export function markAllRead() {
  const entries = load().map(e => ({ ...e, read: true }));
  save(entries);
  notifyChange();
}

export function clearHistory() {
  save([]);
  notifyChange();
}
