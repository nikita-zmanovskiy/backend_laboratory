
import type { Request, Response, NextFunction } from 'express'
import { RateLimitService } from '../services/rateLimit.service.js'
import { CsrfService } from '../services/csrf.service.js'

const rateLimitService = new RateLimitService()

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // пропуск GET
    if (req.method === 'GET') {
        return next()
    }

    // пропускаем получение токена
    if (req.path === '/api/csrf/token') {
        return next()
    }

    // получаем ключ для rate limit
    const csrfToken = req.headers['x-csrf-token'] as string,
     ip = req.ip || req.socket.remoteAddress || 'unknown',
     sessionId = req.body?.session_id || 'no-session'

    // используем комбинацию токен и айпи
    const rateLimitKey = csrfToken
        ? `token:${csrfToken.substring(0, 16)}`
        : `ip:${ip}`

    const result = rateLimitService.checkRateLimit(rateLimitKey)

    // инфа о лимитах
    res.setHeader('X-RateLimit-Limit', '10')
    res.setHeader('X-RateLimit-Window', '60 seconds')

    if (!result.allowed) {
        const stats = rateLimitService.getStats(rateLimitKey)

        res.setHeader('X-RateLimit-Remaining', '0')
        res.setHeader('Retry-After', String(result.retryAfter || 60))

        console.warn(`rateLimit - blocked request:`, {
            key: rateLimitKey,
            ip: ip,
            session: sessionId,
            reason: result.reason
        })

        return res.status(429).json({
            error: result.reason,
            retry_after_seconds: result.retryAfter,
            limit: 10,
            window_seconds: 3,
            tip: 'Wait before making new requests'
        })
    }

    // инфа об оставшихся запросах
    const stats = rateLimitService.getStats(rateLimitKey)
    if (stats) {
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, 10 - stats.count)))
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(stats.windowRemaining / 1000)))
    }

    next()
}