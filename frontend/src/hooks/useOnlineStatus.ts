import { useState, useEffect } from 'react';
import activeApiService from '@/config/api';

// Global state to prevent multiple simultaneous checks
let globalCheckInProgress = false;
let lastCheckTime = 0;
const CHECK_COOLDOWN = 30000; // 30 seconds cooldown between checks

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = async () => {
    // Prevent multiple simultaneous checks across all hook instances
    if (globalCheckInProgress) return;
    
    // Implement cooldown to prevent too frequent checks
    const now = Date.now();
    if (now - lastCheckTime < CHECK_COOLDOWN) return;
    
    globalCheckInProgress = true;
    lastCheckTime = now;
    setIsChecking(true);
    
    try {
      // First check browser online status
      const browserOnline = navigator.onLine;
      if (!browserOnline) {
        setIsOnline(false);
        return;
      }

      // Then test actual API connectivity
      const apiConnected = await activeApiService.testConnection();
      setIsOnline(apiConnected);
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      setIsOnline(false);
    } finally {
      setIsChecking(false);
      globalCheckInProgress = false;
    }
  };

  useEffect(() => {
    // Initial check only if we haven't checked recently
    const now = Date.now();
    if (now - lastCheckTime > CHECK_COOLDOWN) {
      checkConnectivity();
    }

    // Set up browser online/offline listeners
    const handleOnline = () => {
      console.log('Browser came online, checking API connectivity...');
      checkConnectivity();
    };
    
    const handleOffline = () => {
      console.log('Browser went offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Reduced frequency: check every 2 minutes when offline (instead of 30 seconds)
    const intervalId = setInterval(() => {
      if (!isOnline && !globalCheckInProgress) {
        checkConnectivity();
      }
    }, 120000); // 2 minutes

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  return isOnline;
}