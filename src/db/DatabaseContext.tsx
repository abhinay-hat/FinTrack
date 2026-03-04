import { createContext, useContext, ReactNode } from 'react';
import { Database } from '@nozbe/watermelondb';

const DatabaseContext = createContext<Database | null>(null);

interface DatabaseProviderProps {
  database: Database;
  children: ReactNode;
}

export function DatabaseProvider({ database, children }: DatabaseProviderProps) {
  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useWatermelonDB(): Database {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useWatermelonDB must be used within a DatabaseProvider');
  }
  return db;
}
