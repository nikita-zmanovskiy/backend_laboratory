import type { Request, Response, NextFunction } from 'express'
import { csrfService } from '../routes/csrf.routes.js'

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

    const validation = csrfService.validateToken(csrfToken, sessionId)
    console.log(`CSRF - Valid: ${validation.valid}, Error: ${validation.error}`)

    if (!validation.valid) {
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