import axios from 'axios'
import crypto from 'crypto'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { config } from '../../config/env.js'
import { AppError } from '../../utils/errors.js'

interface TokenCache {
    accessToken: string
    expiresAt: number
}

function getHttpsAgent(): https.Agent {
    const certPaths = [
        path.join(process.cwd(), 'russian_trusted_root_ca.cer'),
        path.join(process.cwd(), 'src/tests/russian_trusted_root_ca.cer'),
    ]

    for (const certPath of certPaths) {
        if (fs.existsSync(certPath)) {
            console.log('SSL - certificate loaded:', certPath)
            return new https.Agent({ ca: fs.readFileSync(certPath) })
        }
    }

    console.warn('SSL - certificate not found')
    return new https.Agent({ rejectUnauthorized: false })
}

export class GigaChatAuthService {
    private tokenCache: TokenCache | null = null
    private httpsAgent: https.Agent

    constructor() {
        this.httpsAgent = getHttpsAgent()
    }

    async getAccessToken(): Promise<string> {
        if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 120000 ) { //можно ли использовать токен или нужен новый
            return this.tokenCache.accessToken
        }

        try {
            const authKey = config.gigachat.clientSecret,
             rquid = crypto.randomUUID()

            const response = await axios.post(
                config.gigachat.authUrl,
                new URLSearchParams({ scope: 'GIGACHAT_API_PERS' }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                        'RqUID': rquid,
                        'Authorization': `Basic ${authKey}`
                    },
                    httpsAgent: this.httpsAgent,
                    timeout: 10000
                }
            )

            console.log('gigaChat auth - response:', response.status)

            if (!response.data.access_token) {
                throw new Error('no access token in response: ' + JSON.stringify(response.data))
            }

            this.tokenCache = {
                accessToken: response.data.access_token,
                expiresAt: response.data.expires_at
            }

            console.log('gigaChat auth - success token in response')
            return this.tokenCache.accessToken

        } catch (error: any) {
            console.error('gigaChat auth - error:', error.response?.status, JSON.stringify(error.response?.data))
            throw new AppError(503, 'failed gigaChat API')
        }
    }
}