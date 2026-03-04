import { database } from '@/db';
import Transaction from '@/models/Transaction';
import { Q } from '@nozbe/watermelondb';

// --- Types ---

export interface BenchmarkResult {
  name: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// --- Helpers ---

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

async function measure(
  name: string,
  fn: () => Promise<any>,
  metadata?: Record<string, any>,
): Promise<BenchmarkResult> {
  const start = now();
  await fn();
  const end = now();
  return {
    name,
    durationMs: Math.round((end - start) * 100) / 100,
    timestamp: Date.now(),
    metadata,
  };
}

// --- Benchmark Class ---

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private static appInitTime: number | null = null;

  /**
   * Call this as early as possible in app startup (e.g. index.ts).
   */
  static markAppInit(): void {
    PerformanceBenchmark.appInitTime = now();
  }

  /**
   * Measure elapsed time from markAppInit() to the first render.
   * Call this inside the root component's first useEffect.
   */
  async measureStartupTime(): Promise<BenchmarkResult> {
    const renderTime = now();
    const initTime = PerformanceBenchmark.appInitTime ?? renderTime;
    const durationMs = Math.round((renderTime - initTime) * 100) / 100;

    const result: BenchmarkResult = {
      name: 'App Startup',
      durationMs,
      timestamp: Date.now(),
      metadata: {
        initTimestamp: initTime,
        renderTimestamp: renderTime,
      },
    };
    this.results.push(result);
    return result;
  }

  /**
   * Measure how long an arbitrary DB query takes.
   */
  async measureDBQueryTime(
    queryName: string,
    queryFn: () => Promise<any>,
  ): Promise<BenchmarkResult> {
    const result = await measure(`DB: ${queryName}`, queryFn);
    this.results.push(result);
    return result;
  }

  /**
   * Measure time to process a transaction list (sort + group by date).
   */
  async measureListRenderTime(itemCount: number): Promise<BenchmarkResult> {
    const txCollection = database.get<Transaction>('transactions');

    const result = await measure(
      `List Processing (${itemCount} items)`,
      async () => {
        const transactions = await txCollection
          .query(Q.sortBy('date', Q.desc), Q.take(itemCount))
          .fetch();

        // Simulate list processing: sort and group by date
        const grouped: Record<string, Transaction[]> = {};
        for (const tx of transactions) {
          const dateKey = new Date(tx.date).toISOString().split('T')[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(tx);
        }
        return grouped;
      },
      { itemCount },
    );
    this.results.push(result);
    return result;
  }

  /**
   * Measure CSV parsing and column detection simulation time.
   */
  async measureImportProcessingTime(rowCount: number): Promise<BenchmarkResult> {
    const result = await measure(
      `Import Processing (${rowCount} rows)`,
      async () => {
        // Generate synthetic CSV rows
        const rows: string[][] = [];
        for (let i = 0; i < rowCount; i++) {
          rows.push([
            `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
            `Transaction ${i}`,
            String(Math.round(Math.random() * 10000) / 100),
            i % 2 === 0 ? 'DR' : 'CR',
            String(Math.round(Math.random() * 100000) / 100),
          ]);
        }

        // Column detection heuristic
        const headers = ['Date', 'Description', 'Amount', 'Type', 'Balance'];
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        const numberPattern = /^\d+\.?\d*$/;
        const detected: Record<string, number> = {};

        for (let col = 0; col < headers.length; col++) {
          const sample = rows.slice(0, Math.min(10, rows.length)).map((r) => r[col]);
          if (sample.every((s) => datePattern.test(s))) {
            detected['date'] = col;
          } else if (sample.every((s) => numberPattern.test(s))) {
            detected[col === 2 ? 'amount' : 'balance'] = col;
          } else if (sample.every((s) => s === 'DR' || s === 'CR')) {
            detected['type'] = col;
          } else {
            detected['description'] = col;
          }
        }

        return { rows: rows.length, detected };
      },
      { rowCount },
    );
    this.results.push(result);
    return result;
  }

  /**
   * Run the full benchmark suite: DB queries, list render, and import processing.
   */
  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    this.results = [];

    // Startup
    await this.measureStartupTime();

    // DB query benchmarks
    const txCollection = database.get<Transaction>('transactions');

    for (const count of [100, 500, 1000]) {
      await this.measureDBQueryTime(`Fetch ${count} transactions`, () =>
        txCollection.query(Q.take(count)).fetch(),
      );
    }

    await this.measureDBQueryTime('Fetch by date range (30 days)', () => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return txCollection.query(Q.where('date', Q.gte(thirtyDaysAgo))).fetch();
    });

    await this.measureDBQueryTime('Category totals aggregation', async () => {
      const all = await txCollection
        .query(Q.where('transaction_type', 'expense'))
        .fetch();
      const totals: Record<string, number> = {};
      for (const tx of all) {
        totals[tx.categoryId] = (totals[tx.categoryId] ?? 0) + tx.amount;
      }
      return totals;
    });

    await this.measureDBQueryTime('Batch write 100 transactions', async () => {
      await database.write(async () => {
        const batch: Transaction[] = [];
        for (let i = 0; i < 100; i++) {
          batch.push(
            txCollection.prepareCreate((tx) => {
              tx.amount = Math.round(Math.random() * 10000) / 100;
              tx.date = new Date();
              tx.description = `Benchmark tx ${i}`;
              tx.rawDescription = null;
              tx.transactionType = 'expense';
              tx.isRecurring = false;
              tx.notes = null;
              tx.importSource = null;
              tx.accountId = 'benchmark';
              tx.categoryId = 'benchmark';
              tx.statementId = null;
            }),
          );
        }
        await database.batch(batch);

        // Clean up benchmark records
        const benchmarkTxs = await txCollection
          .query(Q.where('account_id', 'benchmark'))
          .fetch();
        const deletions = benchmarkTxs.map((tx) => tx.prepareDestroyPermanently());
        await database.batch(deletions);
      });
    });

    // List render
    await this.measureListRenderTime(100);
    await this.measureListRenderTime(500);

    // Import processing
    await this.measureImportProcessingTime(500);
    await this.measureImportProcessingTime(2000);

    return this.results;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  logResults(): void {
    if (!__DEV__) return;

    console.log('\n========================================');
    console.log('  FinTrack Performance Benchmark Results');
    console.log('========================================\n');

    const maxNameLen = Math.max(...this.results.map((r) => r.name.length));

    for (const r of this.results) {
      const padded = r.name.padEnd(maxNameLen + 2);
      const duration = `${r.durationMs.toFixed(2)} ms`;
      console.log(`  ${padded} ${duration}`);
    }

    const total = this.results.reduce((sum, r) => sum + r.durationMs, 0);
    console.log(`\n  ${'Total'.padEnd(maxNameLen + 2)} ${total.toFixed(2)} ms`);
    console.log('========================================\n');
  }
}

export function createBenchmark(): PerformanceBenchmark {
  return new PerformanceBenchmark();
}
