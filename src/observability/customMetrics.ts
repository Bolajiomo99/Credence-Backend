import client from 'prom-client';

/**
 * Synthetic probe success counter – increments for each successful end‑to‑end run.
 */
export const syntheticProbeSuccessTotal = new client.Counter({
  name: 'synthetic_probe_success_total',
  help: 'Total successful synthetic probe executions',
  registers: [client.register],
});

/**
 * Synthetic probe failure counter – labelled by step where failure occurred.
 */
export const syntheticProbeFailureTotal = new client.Counter({
  name: 'synthetic_probe_failure_total',
  help: 'Total synthetic probe failures labelled by step',
  labelNames: ['step'],
  registers: [client.register],
});

/**
 * Transaction duration histogram.
 */
export const dbTxnDurationSeconds = new client.Histogram({
  name: 'db_txn_duration_seconds',
  help: 'Database transaction duration in seconds',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 2.5, 5, 7.5, 10],
  registers: [client.register],
});

/**
 * Transaction savepoint count histogram.
 */
export const dbTxnSavepoints = new client.Histogram({
  name: 'db_txn_savepoints',
  help: 'Number of savepoints used in database transactions',
  buckets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20],
  registers: [client.register],
});

/**
 * Register the custom metrics with an external registry if needed.
 * The caller can pass its own Registry; otherwise the default global one is used.
 */
export function registerSyntheticMetrics(registry?: client.Registry): void {
  const reg = registry ?? client.register;
  reg.registerMetric(syntheticProbeSuccessTotal);
  reg.registerMetric(syntheticProbeFailureTotal);
  reg.registerMetric(dbTxnDurationSeconds);
  reg.registerMetric(dbTxnSavepoints);
}
