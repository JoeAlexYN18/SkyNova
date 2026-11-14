import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    void Network.getNetworkStateAsync()
      .then((state) => {
        if (active) setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
      })
      .catch(() => {});
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return isOnline;
}
