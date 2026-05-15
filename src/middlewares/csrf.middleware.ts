import type { Request, Response, NextFunction } from 'express'
import { csrfService } from '../routes/csrf.routes.js'

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET') {
        next()
        return
    }
    if (req.path.startsWith('/api/csrf/') || req.path === '/health' || req.path.startsWith('/api-docs')) {
        next()
        return
    }

    const csrfToken = req.headers['x-csrf-token'] as string,
     sessionId = req.body?.session_id as string | undefined

    if (!csrfToken) {
        res.status(403).json({ error: 'CSRF token required' })
        return
    }

    const validation = csrfService.validateToken(csrfToken, sessionId)

    if (!validation.valid) {
        res.status(403).json({ error: validation.error || 'Invalid token' })
        return
    }

    next()
}