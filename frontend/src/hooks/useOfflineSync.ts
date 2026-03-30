import { useState, useEffect, useCallback } from 'react';
import { createBudget, createExpense, deleteBudget, deleteExpense } from '../features/api';

interface OfflineAction {
  id: string;
  type: 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' | 'CREATE_BUDGET' | 'DELETE_BUDGET';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime: number | null;
  syncErrors: string[];
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingActions: 0,
    lastSyncTime: null,
    syncErrors: [],
  });

  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);

  // Load offline actions from IndexedDB on mount
  useEffect(() => {
    loadOfflineActions();
    updatePendingCount();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      syncPendingActions();
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineActions = async () => {
    try {
      const actions = await getOfflineActions();
      setOfflineActions(actions);
    } catch (error) {
      console.error('Failed to load offline actions:', error);
    }
  };

  const updatePendingCount = async () => {
    try {
      const actions = await getOfflineActions();
      setSyncStatus(prev => ({ ...prev, pendingActions: actions.length }));
    } catch (error) {
      console.error('Failed to update pending count:', error);
    }
  };

  const getOfflineActions = async (): Promise<OfflineAction[]> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpendGuardOffline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['actions'], 'readonly');
        const store = transaction.objectStore('actions');
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('actions')) {
          db.createObjectStore('actions', { keyPath: 'id' });
        }
      };
    });
  };

  const saveOfflineAction = async (action: OfflineAction): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpendGuardOffline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['actions'], 'readwrite');
        const store = transaction.objectStore('actions');
        const addRequest = store.add(action);

        addRequest.onerror = () => reject(addRequest.error);
        addRequest.onsuccess = () => {
          resolve();
          updatePendingCount();
        };
      };
    });
  };

  const removeOfflineAction = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpendGuardOffline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['actions'], 'readwrite');
        const store = transaction.objectStore('actions');
        const deleteRequest = store.delete(id);

        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onsuccess = () => {
          resolve();
          updatePendingCount();
        };
      };
    });
  };

  const addOfflineAction = useCallback((
    type: OfflineAction['type'],
    data: any
  ) => {
    const action: OfflineAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    saveOfflineAction(action);
    setOfflineActions(prev => [...prev, action]);
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (!syncStatus.isOnline || syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    const actions = await getOfflineActions();
    const errors: string[] = [];

    for (const action of actions) {
      try {
        await executeAction(action);
        await removeOfflineAction(action.id);
        setOfflineActions(prev => prev.filter(a => a.id !== action.id));
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        
        // Increment retry count
        const updatedAction = { ...action, retryCount: action.retryCount + 1 };
        
        if (updatedAction.retryCount < 3) {
          await saveOfflineAction(updatedAction);
        } else {
          errors.push(`Failed to sync ${action.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          await removeOfflineAction(action.id);
          setOfflineActions(prev => prev.filter(a => a.id !== action.id));
        }
      }
    }

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncTime: Date.now(),
      syncErrors: errors,
    }));
  }, [syncStatus.isOnline, syncStatus.isSyncing]);

  const executeAction = async (action: OfflineAction): Promise<void> => {
    switch (action.type) {
      case 'CREATE_EXPENSE':
        await createExpense(action.data);
        break;

      case 'UPDATE_EXPENSE':
        throw new Error('UPDATE_EXPENSE is not supported by the current API');

      case 'DELETE_EXPENSE':
        await deleteExpense(action.data.id);
        break;

      case 'CREATE_BUDGET':
        await createBudget(action.data);
        break;

      case 'DELETE_BUDGET':
        await deleteBudget(action.data.id);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  const clearOfflineData = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpendGuardOffline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['actions'], 'readwrite');
        const store = transaction.objectStore('actions');
        const clearRequest = store.clear();

        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => {
          setOfflineActions([]);
          setSyncStatus(prev => ({ ...prev, pendingActions: 0 }));
          resolve();
        };
      };
    });
  };

  return {
    syncStatus,
    offlineActions,
    addOfflineAction,
    syncPendingActions,
    clearOfflineData,
    isOnline: syncStatus.isOnline,
    pendingCount: syncStatus.pendingActions,
    lastSyncTime: syncStatus.lastSyncTime,
  };
};
