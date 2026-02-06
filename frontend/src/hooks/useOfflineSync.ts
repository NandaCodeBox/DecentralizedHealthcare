import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { offlineService } from '@/services/offline';
import activeApiService from '@/config/api';
import { OfflineData } from '@/types';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const updatePendingCount = useCallback(() => {
    setPendingCount(offlineService.getPendingCount());
  }, []);

  // Sync function
  const syncData = useCallback(async (data: OfflineData): Promise<boolean> => {
    try {
      switch (data.type) {
        case 'symptom-intake':
          const symptomResult = await activeApiService.submitSymptoms(data.data);
          return symptomResult.success;
        
        case 'profile-update':
          const profileResult = await activeApiService.updateProfile(data.data);
          return profileResult.success;
        
        case 'episode-update':
          // Handle episode updates if needed
          return true;
        
        default:
          console.warn(`Unknown offline data type: ${data.type}`);
          return false;
      }
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  }, []);

  // Perform sync
  const performSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await offlineService.syncPendingData(syncData);
      updatePendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncData, updatePendingCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      performSync();
    }
  }, [isOnline, pendingCount, performSync]);

  // Update pending count on mount and when data changes
  useEffect(() => {
    updatePendingCount();
    
    // Listen for storage changes (if multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'healthcare_offline_queue') {
        updatePendingCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    performSync,
    updatePendingCount,
  };
}