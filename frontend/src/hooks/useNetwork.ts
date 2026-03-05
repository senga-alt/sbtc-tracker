import { useState } from 'react';

export function useNetwork() {
  const [network, setNetworkState] = useState<'mainnet' | 'testnet'>(() => {
    return (localStorage.getItem('sbtc-network') as 'mainnet' | 'testnet') || 'mainnet';
  });

  const setNetwork = (n: 'mainnet' | 'testnet') => {
    setNetworkState(n);
    localStorage.setItem('sbtc-network', n);
  };

  return { network, setNetwork };
}
