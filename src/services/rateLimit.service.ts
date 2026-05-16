interface RateLimitEntry {
    count: number
    firstRequestTime: number
    blocked: boolean
    blockedUntil: number
}
interface BruteForceEntry {
    failures: number
    firstFailure: number
    blocked: boolean
    blockedUntil: number
}

export class RateLimitService {
    private store: Map<string, RateLimitEntry>
    private bruteForceStore: Map<string, BruteForceEntry>
    private readonly MAX_REQUESTS = 10
    private readonly WINDOW_MS = 60000 // блок окна, если за минуту много запросов, то блок
    private readonly BLOCK_DURATION_MS = 120000

    private readonly MAX_FAILURES = 5         // 5 неудачных попыток
    private readonly BRUTE_BLOCK_MS = 300000  // блокировка на 5 минут
    private readonly BRUTE_WINDOW_MS = 60000  // в течение 1 минуты

    constructor() {
        this.store = new Map()
        this.bruteForceStore = new Map()
        setInterval(() => this.cleanup(), 60000)
    }
    checkBruteForce(key: string): { allowed: boolean; reason?: string; retryAfter?: number } {
        const now = Date.now()
        let entry = this.bruteForceStore.get(key)

        if (!entry) {
            entry = { failures: 0, firstFailure: now, blocked: false, blockedUntil: 0 }
            this.bruteForceStore.set(key, entry)
        }

        if (entry.blocked) {
            if (now < entry.blockedUntil) {
                const remaining = Math.ceil((entry.blockedUntil - now) / 1000)
                return {
                    allowed: false,
                    reason: `Too many failed attempts. Blocked for ${remaining} seconds.`,
                    retryAfter: remaining
                }
            }
            // разблок
            entry.blocked = false
            entry.failures = 0
            entry.firstFailure = now
        }

        // проверка окна попыток
        if (now - entry.firstFailure > this.BRUTE_WINDOW_MS) {
            entry.failures = 0
            entry.firstFailure = now
        }

        return { allowed: true }
    }
    recordFailure(key: string): void {
        let entry = this.bruteForceStore.get(key)
        if (!entry) {
            entry = { failures: 0, firstFailure: Date.now(), blocked: false, blockedUntil: 0 }
            this.bruteForceStore.set(key, entry)
        }

        entry.failures++
        console.log(`bruteForce - failure ${entry.failures}/${this.MAX_FAILURES} for ${key}`)

        if (entry.failures >= this.MAX_FAILURES) {
            entry.blocked = true
            entry.blockedUntil = Date.now() + this.BRUTE_BLOCK_MS
            console.warn(`bruteForce - BLOCKED: ${key} after ${entry.failures} failures`)
        }
    }

    resetBruteForce(key: string): void {
        this.bruteForceStore.delete(key)
    }
    checkRateLimit(key: string): { allowed: boolean; reason?: string; retryAfter?: number } {
        const now = Date.now()
        let entry = this.store.get(key)

        if (!entry) {
            entry = {
                count: 0,
                firstRequestTime: now,
                blocked: false,
                blockedUntil: 0
            }
            this.store.set(key, entry)
        }

        if (entry.blocked) {
            if (now < entry.blockedUntil) {
                const remainingMs = entry.blockedUntil - now
                return {
                    allowed: false,
                    reason: `Too many requests. Blocked for ${Math.ceil(remainingMs / 1000)} seconds. Limit: ${this.MAX_REQUESTS} requests per minute.`,
                    retryAfter: Math.ceil(remainingMs / 1000)
                }
            } else {
                entry.blocked = false
                entry.count = 0
                entry.firstRequestTime = now
            }
        }

        const windowElapsed = now - entry.firstRequestTime

        if (windowElapsed > this.WINDOW_MS) {
            entry.count = 1
            entry.firstRequestTime = now
            return { allowed: true }
        }

        entry.count++

        if (entry.count > this.MAX_REQUESTS) {
            entry.blocked = true
            entry.blockedUntil = now + this.BLOCK_DURATION_MS

            console.warn(`rateLimit - BLOCKED: ${key} - ${entry.count} requests in ${(windowElapsed / 1000).toFixed(1)}s`)

            return {
                allowed: false,
                reason: `rate limit: ${this.MAX_REQUESTS} requests per minute. Blocked for ${this.BLOCK_DURATION_MS / 1000} seconds.`,
                retryAfter: Math.ceil(this.BLOCK_DURATION_MS / 1000)
            }
        }

        return { allowed: true }
    }

    getStats(key: string): { count: number; windowRemaining: number; blocked: boolean } | null {
        const entry = this.store.get(key)
        if (!entry) return null

        const now = Date.now(),
         windowElapsed = now - entry.firstRequestTime

        return {
            count: entry.count,
            windowRemaining: Math.max(0, this.WINDOW_MS - windowElapsed),
            blocked: entry.blocked && now < entry.blockedUntil
        }
    }

    resetLimit(key: string): void {
        this.store.delete(key)
    }
    //чистим пользователей которые заблокированные
    private cleanup(): void {
        const now = Date.now()
        let cleaned = 0

        for (const [key, entry] of this.store.entries()) {
            // удаляем если блокировка истекла и прошло больше 5 минут
            if (entry.blocked && now > entry.blockedUntil + 300000) {
                this.store.delete(key)
                cleaned++
            }
            // удаляем если окно истекло и прошло больше 30 секунд
            else if (!entry.blocked && (now - entry.firstRequestTime) > this.WINDOW_MS + 30000) {
                this.store.delete(key)
                cleaned++
            }
        }

        // Очистка тех кто заблочен по ip
        for (const [key, entry] of this.bruteForceStore.entries()) {
            if (entry.blocked && now > entry.blockedUntil + 600000) {
                this.bruteForceStore.delete(key)
            }
            if (!entry.blocked && (now - entry.firstFailure) > this.BRUTE_WINDOW_MS + 60000) {
                this.bruteForceStore.delete(key)
            }
        }
        if (cleaned > 0) {
            console.log(`rateLimit - cleaned ${cleaned} entries`)
        }
    }
}