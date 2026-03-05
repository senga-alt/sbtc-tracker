import { getNotificationPreferences } from '@/hooks/useNotificationPreferences';

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

export function sendPushNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  const { pushNotifications } = getNotificationPreferences();
  if (!pushNotifications || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/favicon.ico' });
}
