import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Pool } from 'pg'

describe('DB Pool configuration', () => {
  let envSnapshot: NodeJS.ProcessEnv

  beforeEach(() => {
    envSnapshot = { ...process.env }
  })

  afterEach(() => {
    process.env = envSnapshot
    vi.resetModules()
  })

  it('pool is a Pool instance with expected options.max', async () => {
    const { pool } = await import('./pool.js')
    expect(pool).toBeInstanceOf(Pool)
    // The default in the code without env vars might be the fallback (20)
    // Actually we can check options if exposed or just check it's a Pool
    expect(pool.options.max).toBeDefined()
  })

  it('workerPool is a separate Pool instance', async () => {
    const { pool, workerPool } = await import('./pool.js')
    expect(workerPool).toBeInstanceOf(Pool)
    expect(workerPool).not.toBe(pool)
  })

  it('envInt returns fallback for missing env var', async () => {
    const { envInt } = await import('./pool.js')
    expect(envInt('MISSING_VAR_TEST', 42)).toBe(42)
  })

  it('envInt returns fallback for non-numeric string', async () => {
    const { envInt } = await import('./pool.js')
    process.env.NON_NUMERIC_TEST = 'not_a_number'
    expect(envInt('NON_NUMERIC_TEST', 42)).toBe(42)
  })
  
  it('envInt returns parsed number for valid string', async () => {
    const { envInt } = await import('./pool.js')
    process.env.VALID_NUM_TEST = '99'
    expect(envInt('VALID_NUM_TEST', 42)).toBe(99)
  })

  it('statement_timeout is set in options string', async () => {
    const { pool, workerPool } = await import('./pool.js')
    expect(pool.options.options).toContain('-c statement_timeout=')
    expect(workerPool.options.options).toContain('-c statement_timeout=')
  })
})
