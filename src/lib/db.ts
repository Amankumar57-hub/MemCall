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

export interface PatientJournal {
  id: string;
  patient_id: string;
  title?: string | null;
  content?: string | null;
  audio_url?: string | null;
  duration?: number | null;
  created_at: string;
}

export interface PatientItem {
  id: string;
  patient_id: string;
  item_name: string;
  location_desc: string;
  image_url?: string | null;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relation: string | null;
  avatar_url: string;
  avatar_base64?: string;
  face_descriptor?: Float32Array | number[];
  created_at: string;
}

const db = new Dexie('MemCallDB') as Dexie & {
  sync_queue: EntityTable<SyncQueueItem, 'id'>;
  audio_folders: EntityTable<AudioFolder, 'id'>;
  audio_files: EntityTable<AudioFile, 'id'>;
  patient_journals: EntityTable<PatientJournal, 'id'>;
  patient_items: EntityTable<PatientItem, 'id'>;
  family_members: EntityTable<FamilyMember, 'id'>;
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

db.version(3).stores({
  sync_queue: '++id, table_name, status, created_at',
  audio_folders: '++id, name, created_at',
  audio_files: '++id, folder_id, name, created_at',
  patient_journals: 'id, patient_id, created_at',
  patient_items: 'id, patient_id, created_at'
});

db.version(4).stores({
  sync_queue: '++id, table_name, status, created_at',
  audio_folders: '++id, name, created_at',
  audio_files: '++id, folder_id, name, created_at',
  patient_journals: 'id, patient_id, created_at',
  patient_items: 'id, patient_id, created_at',
  family_members: 'id, user_id'
});

export { db };
