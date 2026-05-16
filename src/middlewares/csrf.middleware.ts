import type { Request, Response, NextFunction } from 'express'
import { csrfService } from '../routes/csrf.routes.js'
import { RateLimitService } from '../services/rateLimit.service.js'

const rateLimitService = new RateLimitService()

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET') { next(); return }
    if (req.path.startsWith('/api/csrf/') || req.path === '/health' || req.path.startsWith('/api-docs')) { next(); return }

    const csrfToken = req.headers['x-csrf-token'] as string
    const sessionId = req.body?.session_id as string | undefined

    console.log(`CSRF - Token: ${csrfToken?.substring(0,16)}... Session: ${sessionId}`)

    if (!csrfToken) {
        console.log('CSRF - No token')
        res.status(403).json({ error: 'CSRF token required' })
        return
    }
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const bruteKey = `ip:${ip}`
    const bruteCheck = rateLimitService.checkBruteForce(bruteKey)
    if (!bruteCheck.allowed) {
        res.status(429).json({
            error: bruteCheck.reason,
            retry_after: bruteCheck.retryAfter
        })
        return
    }
    console.log(`CSRF - Token: ${csrfToken?.substring(0,16)}... Session: ${sessionId}`)

    if (!csrfToken) {
        rateLimitService.recordFailure(bruteKey)
        console.log('CSRF - No token')
        res.status(403).json({ error: 'CSRF token required' })
        return
    }
    const validation = csrfService.validateToken(csrfToken, sessionId)
    console.log(`CSRF - Valid: ${validation.valid}, Error: ${validation.error}`)

    if (!validation.valid) {
        rateLimitService.recordFailure(bruteKey)
        res.status(403).json({ error: validation.error || 'Invalid token' })
        return
    }

    const classroomCode = (req.headers['x-classroom-code'] as string) || req.body?.classroom_code
    if (classroomCode && sessionId) {
        const tokenInfo = csrfService.getTokenInfo(sessionId)
        if (
            tokenInfo &&
            tokenInfo.classroomCode !== 'unknown' &&
            tokenInfo.classroomCode.toUpperCase() !== classroomCode.toUpperCase()
        ) {
            res.status(403).json({ error: 'token does not belong to this classroom' })
            return
        }
    }

    console.log('CSRF - OK')
    next()
}