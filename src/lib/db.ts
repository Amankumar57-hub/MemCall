import Dexie, { type EntityTable } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed';
}

const db = new Dexie('MemCallDB') as Dexie & {
  sync_queue: EntityTable<SyncQueueItem, 'id'>;
};

// Define Schema
db.version(1).stores({
  sync_queue: '++id, table_name, status, created_at'
});

export { db };
