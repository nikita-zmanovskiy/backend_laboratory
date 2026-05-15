import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { AppError } from '../../utils/errors.js'
import * as https from "node:https";
import * as fs from "node:fs";
import path from "node:path";

export const AI_TIMEOUT_MS = 60000
export const AI_RETRY_ATTEMPTS = 1

export class BaseAiService {
    protected client: AxiosInstance
    protected serviceName: string

    constructor(serviceName: string, baseURL?: string) {
        this.serviceName = serviceName
        let httpsAgent: https.Agent | undefined

        const certPaths = [
            'src/tests/russian_trusted_root_ca.cer',
            'tests/russian_trusted_root_ca.cer',
            'russian_trusted_root_ca.cer',
            path.join(process.cwd(), 'russian_trusted_root_ca.cer'),
        ]

        for (const certPath of certPaths) {
            if (fs.existsSync(certPath)) {
                httpsAgent = new https.Agent({
                    ca: fs.readFileSync(certPath),
                    rejectUnauthorized: true
                })
                console.log(`[${serviceName}] Loaded certificate: ${certPath}`)
                break
            }
        }

        // TODO: переработать
        if (!httpsAgent) {
            console.warn(`[${serviceName}] Certificate not found, disabling SSL verification (dev only)`)
            httpsAgent = new https.Agent({
                rejectUnauthorized: false
            })
        }

        this.client = axios.create({
            timeout: AI_TIMEOUT_MS,
            baseURL: baseURL,
            httpsAgent: httpsAgent
        })
    }
    protected async withRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number = AI_RETRY_ATTEMPTS,
        serviceName: string = this.serviceName
    ): Promise<T> {
        let lastError: any

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.pow(2, attempt - 1) * 1000
                    console.log(`[${serviceName}] Retry ${attempt}/${maxRetries} after ${delay}ms`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }

                return await operation()
            } catch (error) {
                lastError = error

                // не ретраим если ошибка клиента кроме 429 (превыш. лимит)
                if (error instanceof AppError &&
                    error.statusCode >= 400 &&
                    error.statusCode < 500 &&
                    error.statusCode !== 429) {
                    throw error
                }

                if (attempt === maxRetries) {
                    throw new AppError(503,
                        `${serviceName} unavailable after ${maxRetries} retries. Please try again later.`
                    )
                }
            }
        }

        throw lastError
    }

    protected async makeRequest(config: AxiosRequestConfig): Promise<any> {
        const startTime = Date.now()

        try {
            const response = await this.client(config)
            return response.data
        } catch (error: any) {
            const elapsed = Date.now() - startTime

            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                throw new AppError(504,
                    `${this.serviceName} request timed out after ${elapsed}ms. Please try again.`
                )
            }

            if (error.response) {
                const status = error.response.status,
                 message = error.response.data?.message || error.message

                if (status === 429) {
                    throw new AppError(429,
                        `${this.serviceName} rate limit exceeded. Please wait before retrying.`
                    )
                }

                throw new AppError(status,
                    `${this.serviceName} error: ${message}`
                )
            }

            throw new AppError(503,
                `${this.serviceName} is temporarily unavailable. Please try again later.`
            )
        }
    }
}