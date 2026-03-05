import { useEffect, useRef } from 'react';
import { getNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { addNotification } from '@/lib/notificationHistory';
import { loadAlerts, removeAlert, incrementFireCount } from '@/lib/priceAlerts';
import { sendPushNotification } from '@/lib/pushNotification';
import { toast } from 'sonner';
import type { PriceData } from '@/types';

export function usePriceAlerts(prices: PriceData[]) {
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (prices.length === 0) return;

    const { priceAlerts, priceThreshold } = getNotificationPreferences();

    // --- Existing percentage-based alerts ---
    if (priceAlerts) {
      for (const p of prices) {
        const abs = Math.abs(p.changePercent24h);
        const key = `${p.symbol}-${p.changePercent24h >= 0 ? 'up' : 'down'}`;

        if (abs >= priceThreshold && !alerted.current.has(key)) {
          alerted.current.add(key);
          const direction = p.changePercent24h >= 0 ? 'up' : 'down';
          const emoji = direction === 'up' ? '📈' : '📉';
          const msg = `${emoji} ${p.symbol} is ${direction} ${abs.toFixed(1)}% in the last 24h`;
          toast(msg, { duration: 8000 });
          addNotification('price', msg);
          sendPushNotification('sBTC Price Alert', msg);
        } else if (abs < priceThreshold) {
          alerted.current.delete(`${p.symbol}-up`);
          alerted.current.delete(`${p.symbol}-down`);
        }
      }
    }

    // --- User-defined threshold alerts ---
    const userAlerts = loadAlerts();
    for (const alert of userAlerts) {
      const priceData = prices.find(p => p.symbol === alert.symbol);
      if (!priceData) continue;

      const alertKey = `user-${alert.id}`;
      if (alerted.current.has(alertKey)) continue;

      const crossed =
        (alert.direction === 'above' && priceData.price >= alert.targetPrice) ||
        (alert.direction === 'below' && priceData.price <= alert.targetPrice);

      if (crossed) {
        alerted.current.add(alertKey);
        const emoji = alert.direction === 'above' ? '🔔' : '🔕';
        const formatted = alert.targetPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const msg = `${emoji} ${alert.symbol} crossed ${alert.direction} ${formatted} (now ${priceData.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})`;
        toast(msg, { duration: 8000 });
        addNotification('price', msg);
        sendPushNotification('Price Alert Triggered', msg);
        if (!alert.repeat) {
          removeAlert(alert.id);
        } else {
          incrementFireCount(alert.id);
        }
      } else if (alert.repeat) {
        // Re-arm repeating alert when price moves back
        alerted.current.delete(alertKey);
      }
    }
  }, [prices]);
}
