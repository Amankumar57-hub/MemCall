import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processSyncQueue = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const pendingItems = await db.sync_queue.where('status').equals('pending').toArray();
      
      if (pendingItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`Processing ${pendingItems.length} offline items...`);

      for (const item of pendingItems) {
        // Mark as syncing
        if (item.id) {
          await db.sync_queue.update(item.id, { status: 'syncing' });
        }

        try {
          if (item.operation === 'INSERT') {
            const { error } = await supabase.from(item.table_name).insert(item.payload);
            if (error) throw error;
          } else if (item.operation === 'DELETE') {
            let query = supabase.from(item.table_name).delete();
            // apply payload as equality conditions
            for (const key in item.payload) {
              if (key.endsWith('_gte')) {
                query = query.gte(key.replace('_gte', ''), item.payload[key]);
              } else {
                query = query.eq(key, item.payload[key]);
              }
            }
            const { error } = await query;
            if (error) throw error;
          }
          // Other operations (UPDATE) can be handled here if needed in the future

          // Success: remove from local queue
          if (item.id) {
            await db.sync_queue.delete(item.id);
          }
        } catch (err) {
          console.error(`Failed to sync item ${item.id}:`, err);
          // Mark as failed or revert to pending to retry later
          if (item.id) {
            await db.sync_queue.update(item.id, { status: 'pending' });
          }
        }
      }
    } catch (err) {
      console.error("Error accessing sync queue:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    isSyncing,
    processSyncQueue
  };
}
