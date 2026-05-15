
import crypto from 'crypto'
import {isExpired} from "../utils/moscowTime.js";

interface TokenData {
    token: string
    sessionId: string
    classroomCode: string
    createdAt: Date
    expiresAt: Date
    lastUsedAt: Date
}

export class CsrfService {
    private tokenStore: Map<string, TokenData>
    private readonly DEFAULT_TOKEN_LIFETIME_MS = 24 * 3600000 // 24 ч

    constructor() {
        this.tokenStore = new Map()
        setInterval(() => this.cleanupExpiredTokens(), 300000)
    }

    //создать токен с временем жизни класса
    createToken(sessionId: string, classroomCode: string, expiresAt: Date): string {
        const newToken = this.generateTokenValue(),
         now = new Date()

        // токен живет до истечения класса
        this.tokenStore.set(sessionId, {
            token: newToken,
            sessionId,
            classroomCode,
            createdAt: now,
            expiresAt: expiresAt,
            lastUsedAt: now
        })

        console.log(`csrf - Token created for ${classroomCode}, expires: ${expiresAt.toISOString()}`)
        return newToken
    }

    getOrCreateToken(sessionId?: string): { token: string; isNew: boolean } {
        const effectiveSessionId = sessionId || `auto_${crypto.randomBytes(8).toString('hex')}`,
            existingData = this.tokenStore.get(effectiveSessionId)

        if (existingData) {
            if (Date.now() < existingData.expiresAt.getTime()) {
                existingData.lastUsedAt = new Date()
                return { token: existingData.token, isNew: false }
            } else {
                this.tokenStore.delete(effectiveSessionId)
            }
        }

        const newToken = this.generateTokenValue(),
         now = new Date()

        this.tokenStore.set(effectiveSessionId, {
            token: newToken,
            sessionId: effectiveSessionId,
            classroomCode: 'unknown',
            createdAt: now,
            expiresAt: new Date(now.getTime() + this.DEFAULT_TOKEN_LIFETIME_MS),
            lastUsedAt: now
        })

        return { token: newToken, isNew: true }
    }

    extendTokensForClassroom(classroomCode: string, additionalMinutes: number): void {
        const additionalMs = additionalMinutes * 60 * 1000
        let extendedCount = 0

        for (const [, data] of this.tokenStore.entries()) {
            if (data.classroomCode === classroomCode) {
                data.expiresAt = new Date(data.expiresAt.getTime() + additionalMs)
                extendedCount++
            }
        }

        console.log(`csrf - Extended ${extendedCount} tokens for classroom ${classroomCode} by ${additionalMinutes}min`)
    }

    syncTokensExpiryForClassroom(classroomCode: string, expiresAt: Date): void {
        let syncedCount = 0

        for (const [, data] of this.tokenStore.entries()) {
            if (data.classroomCode === classroomCode) {
                data.expiresAt = new Date(expiresAt)
                syncedCount++
            }
        }

        console.log(`csrf - Synced ${syncedCount} tokens for classroom ${classroomCode} to ${expiresAt.toISOString()}`)
    }

    validateToken(token: string, sessionId?: string): { valid: boolean; error?: string } {
        if (!token || typeof token !== 'string') {
            return { valid: false, error: 'token is required' }
        }
        //для символов в токене
        if (!/^[a-f0-9]{64}$/.test(token)) {
            return { valid: false, error: 'invalid token format' }
        }

        let tokenData: TokenData | undefined

        if (sessionId) {
            tokenData = this.tokenStore.get(sessionId)
            if (tokenData && tokenData.token !== token) {
                return { valid: false, error: 'token does not match session' }
            }
        } else {
            for (const data of this.tokenStore.values()) {
                if (data.token === token) {
                    tokenData = data
                    break
                }
            }
        }

        if (!tokenData) {
            return { valid: false, error: 'token not found or expired' }
        }

        if (isExpired(tokenData.expiresAt)) {
            this.tokenStore.delete(tokenData.sessionId)
            return { valid: false, error: 'token has expired. classroom session ended.' }
        }

        return { valid: true }
    }
    getTokenInfo(sessionId: string): TokenData | null {
        return this.tokenStore.get(sessionId) || null
    }

    refreshToken(sessionId: string): string | null {
        const tokenData = this.tokenStore.get(sessionId)
        if (!tokenData) return null
        return tokenData.token
    }

    revokeToken(sessionId: string): void {
        this.tokenStore.delete(sessionId)
    }
    private generateTokenValue(): string {
        return crypto.randomBytes(32).toString('hex')
    }
    private cleanupExpiredTokens(): void {
        const now = new Date()
        let cleanedCount = 0

        for (const [sessionId, data] of this.tokenStore.entries()) {
            if (now.getTime() > data.expiresAt.getTime()) {
                this.tokenStore.delete(sessionId)
                cleanedCount++
            }
        }

        if (cleanedCount > 0) {
            console.log(`csrf - cleaned ${cleanedCount} expired tokens`)
        }
    }
}