import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

interface SyncItem {
    id: string;
    endpoint: string;
    method: string;
    body: any;
    timestamp: number;
    type: 'ATTENDANCE' | 'EXPENSE' | 'DELIVERY_NOTE';
}

interface SyncContextType {
    isOnline: boolean;
    pendingSyncCount: number;
    addToSyncQueue: (item: Omit<SyncItem, 'id' | 'timestamp'>) => void;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const STORAGE_KEY = 'zerain_sync_queue';

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<SyncItem[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }, [queue]);

    const addToSyncQueue = useCallback((item: Omit<SyncItem, 'id' | 'timestamp'>) => {
        setQueue(prev => {
            // Deduplication: If adding a DELIVERY_NOTE for the same endpoint, 
            // the new one (most recent on device) wins.
            const filtered = prev.filter(q =>
                !(q.type === item.type && q.endpoint === item.endpoint)
            );

            const newItem: SyncItem = {
                ...item,
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now()
            };

            return [...filtered, newItem];
        });
    }, []);

    const syncNow = useCallback(async () => {
        if (!navigator.onLine || queue.length === 0) return;

        console.log(`ZERAIN SYNC: Intentando sincronizar ${queue.length} elementos...`);
        const newQueue = [...queue];
        const failedItems: SyncItem[] = [];

        for (const item of newQueue) {
            try {
                const token = localStorage.getItem('driver_token');
                const res = await fetch(`${API_BASE}${item.endpoint}`, {
                    method: item.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify(item.body)
                });

                if (!res.ok) {
                    throw new Error('Sync failed');
                }
            } catch (e) {
                console.error(`ZERAIN SYNC ERROR: Falló item ${item.id}`, e);
                failedItems.push(item);
            }
        }

        setQueue(failedItems);
        if (failedItems.length === 0) {
            console.log('ZERAIN SYNC: Sincronización completada con éxito.');
        }
    }, [queue]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && queue.length > 0) {
            syncNow();
        }
    }, [isOnline, queue.length, syncNow]);

    const value = {
        isOnline,
        pendingSyncCount: queue.length,
        addToSyncQueue,
        syncNow
    };

    return (
        <SyncContext.Provider value={value}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error('useSync must be used within SyncProvider');
    return context;
};
