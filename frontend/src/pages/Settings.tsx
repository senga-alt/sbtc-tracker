import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useNetwork } from '@/hooks/useNetwork';
import { useWallet } from '@/hooks/useWallet';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useUserPriceAlerts } from '@/hooks/useUserPriceAlerts';
import { requestPushPermission } from '@/lib/pushNotification';
import { toast } from 'sonner';
import AppearanceCard from '@/components/settings/AppearanceCard';
import NetworkCard from '@/components/settings/NetworkCard';
import DemoModeCard from '@/components/settings/DemoModeCard';
import NotificationsCard from '@/components/settings/NotificationsCard';
import PriceAlertsCard from '@/components/settings/PriceAlertsCard';
import WalletCard from '@/components/settings/WalletCard';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { network, setNetwork } = useNetwork();
  const { wallet, connect, disconnect, isConnecting } = useWallet();
  const { prefs, update: updatePrefs } = useNotificationPreferences();
  const { demoMode, setDemoMode } = useDemoMode();
  const { alerts: priceAlerts, add: addPriceAlert, remove: removePriceAlert, update: updatePriceAlert, resetCount: resetPriceAlertCount } = useUserPriceAlerts();
  const supportsPush = 'Notification' in window;
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    supportsPush ? Notification.permission : 'denied'
  );

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      const perm = await requestPushPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        updatePrefs({ pushNotifications: true });
      } else {
        updatePrefs({ pushNotifications: false });
        toast.error('Browser notifications blocked. Enable them in your browser settings.');
      }
    } else {
      updatePrefs({ pushNotifications: false });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Settings</h1>
      <AppearanceCard theme={theme} setTheme={setTheme} />
      <NetworkCard network={network} setNetwork={setNetwork} />
      <DemoModeCard demoMode={demoMode} setDemoMode={setDemoMode} />
      <NotificationsCard
        prefs={prefs}
        updatePrefs={updatePrefs}
        supportsPush={supportsPush}
        pushPermission={pushPermission}
        onPushToggle={handlePushToggle}
      />
      <PriceAlertsCard alerts={priceAlerts} addAlert={addPriceAlert} removeAlert={removePriceAlert} updateAlert={updatePriceAlert} resetCount={resetPriceAlertCount} />
      <WalletCard wallet={wallet} connect={connect} disconnect={disconnect} isConnecting={isConnecting} />
    </div>
  );
}
