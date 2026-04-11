import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// Crea un nuevo limitador que permite 5 peticiones por hora
export const orderRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
})
