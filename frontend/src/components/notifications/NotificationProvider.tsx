import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useTransactionAlerts } from '@/hooks/useTransactionAlerts';
import type { PriceData } from '@/types';

export function NotificationProvider({ prices }: { prices: PriceData[] }) {
  usePriceAlerts(prices);
  useTransactionAlerts();
  return null;
}
