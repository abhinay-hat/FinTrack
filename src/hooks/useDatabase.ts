import { useEffect, useState } from 'react';
import { database, seedDefaultCategories } from '@/db';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await seedDefaultCategories(database);
        setIsReady(true);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setIsReady(true); // Still allow app to load
      }
    }
    init();
  }, []);

  return { database, isReady };
}
