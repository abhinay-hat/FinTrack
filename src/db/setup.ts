import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { modelClasses } from '../models';

// SQLiteAdapter with JSI persists to a real SQLite file (expo-sqlite is a dependency).
// LokiJS + useIncrementalIndexedDB is not viable on React Native (no IndexedDB).
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  dbName: 'fintrack',
  onSetUpError: (error) => {
    console.error('WatermelonDB SQLite setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses,
});
