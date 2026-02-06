import { OfflineData } from '@/types';

class OfflineService {
  private readonly STORAGE_KEY = 'healthcare_offline_queue';
  private readonly USER_DATA_KEY = 'healthcare_user_data';

  // Queue management
  addToQueue(data: Omit<OfflineData, 'id' | 'timestamp' | 'synced'>): void {
    const offlineData: OfflineData = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      synced: false,
      ...data,
    };

    const queue = this.getQueue();
    queue.push(offlineData);
    this.saveQueue(queue);
  }

  getQueue(): OfflineData[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: OfflineData[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  markAsSynced(id: string): void {
    const queue = this.getQueue();
    const updated = queue.map(item => 
      item.id === id ? { ...item, synced: true } : item
    );
    this.saveQueue(updated);
  }

  removeFromQueue(id: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    this.saveQueue(filtered);
  }

  clearSyncedItems(): void {
    const queue = this.getQueue();
    const unsynced = queue.filter(item => !item.synced);
    this.saveQueue(unsynced);
  }

  getPendingCount(): number {
    return this.getQueue().filter(item => !item.synced).length;
  }

  // User data caching
  cacheUserData(key: string, data: any): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cached = this.getCachedData();
      cached[key] = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to cache user data:', error);
    }
  }

  getCachedUserData(key: string): any | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = this.getCachedData();
      return cached[key]?.data || null;
    } catch {
      return null;
    }
  }

  private getCachedData(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(this.USER_DATA_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Utility methods
  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  // Storage management
  clearAllOfflineData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.USER_DATA_KEY);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  getStorageUsage(): { used: number; available: number } {
    if (typeof window === 'undefined' || !('storage' in navigator)) {
      return { used: 0, available: 0 };
    }

    try {
      // Estimate storage usage
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }

      return {
        used: used * 2, // Rough estimate (UTF-16 encoding)
        available: 5 * 1024 * 1024, // Typical localStorage limit (5MB)
      };
    } catch {
      return { used: 0, available: 0 };
    }
  }

  // Sync functionality
  async syncPendingData(syncFunction: (data: OfflineData) => Promise<boolean>): Promise<void> {
    const queue = this.getQueue();
    const pending = queue.filter(item => !item.synced);

    for (const item of pending) {
      try {
        const success = await syncFunction(item);
        if (success) {
          this.markAsSynced(item.id);
        }
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
      }
    }

    // Clean up synced items after successful sync
    this.clearSyncedItems();
  }
}

export const offlineService = new OfflineService();
export default offlineService;