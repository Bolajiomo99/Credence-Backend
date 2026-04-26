import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { PayoutsRepository } from '../db/repositories/payoutsRepository.js'
import { IdempotencyRepository } from '../db/repositories/idempotencyRepository.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'
import { validate } from '../middleware/validate.js'

const createPayoutBodySchema = z.object({
  recipient: z.string().min(1),
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'amount must be a positive numeric string'),
  currency: z.string().length(3).toUpperCase().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export function createPayoutsRouter(): Router {
  const router = Router()
  const payoutsRepo = new PayoutsRepository(pool)
  const idempotencyRepo = new IdempotencyRepository(pool)

  /**
   * POST /api/payouts
   *
   * Creates a new payout. Requires an `Idempotency-Key` header.
   * Replays the stored response on exact-match retries.
   * Rejects key reuse with a different payload (400).
   */
  router.post(
    '/',
    idempotencyMiddleware(idempotencyRepo),
    validate({ body: createPayoutBodySchema }),
    async (req, res, next) => {
      try {
        const body = req.validated!.body as z.infer<typeof createPayoutBodySchema>
        const payout = await payoutsRepo.create(body)
        res.status(201).json({ success: true, data: payout })
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
