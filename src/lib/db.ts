import Dexie, { type EntityTable } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed';
}

export interface AudioFolder {
  id?: number;
  name: string;
  created_at: string;
}

export interface AudioFile {
  id?: number;
  folder_id: number;
  name: string;
  blob: Blob;
  duration: number; // seconds
  created_at: string;
}

const db = new Dexie('MemCallDB') as Dexie & {
  sync_queue: EntityTable<SyncQueueItem, 'id'>;
  audio_folders: EntityTable<AudioFolder, 'id'>;
  audio_files: EntityTable<AudioFile, 'id'>;
};

// Define Schema
db.version(1).stores({
  sync_queue: '++id, table_name, status, created_at'
});

db.version(2).stores({
  sync_queue: '++id, table_name, status, created_at',
  audio_folders: '++id, name, created_at',
  audio_files: '++id, folder_id, name, created_at'
});

export { db };
