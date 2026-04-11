import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// Crea un nuevo limitador que permite 50 peticiones por hora para evitar bloqueos 429 durante QA
export const orderRateLimit = redis ? new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(50, '1 h'),
  analytics: true,
}) : null
