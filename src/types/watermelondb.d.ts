import { Database } from '@nozbe/watermelondb';
import { ReactNode } from 'react';

declare module '@nozbe/watermelondb/DatabaseProvider' {
  interface DatabaseProviderProps {
    database: Database;
    children: ReactNode;
  }

  export default function DatabaseProvider(props: DatabaseProviderProps): JSX.Element;
}
