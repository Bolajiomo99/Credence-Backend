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
 * Register the custom metrics with an external registry if needed.
 * The caller can pass its own Registry; otherwise the default global one is used.
 */
export function registerSyntheticMetrics(registry?: client.Registry): void {
  const reg = registry ?? client.register;
  reg.registerMetric(syntheticProbeSuccessTotal);
  reg.registerMetric(syntheticProbeFailureTotal);
}
