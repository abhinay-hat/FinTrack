import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Migration v1 is the initial schema — no migrations needed yet.
    // Future migrations will be added here as:
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({ table: 'transactions', columns: [...] }),
    //   ],
    // },
  ],
});
