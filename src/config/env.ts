import dotenv from 'dotenv'
import path from 'path'

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

export const config = {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    https: process.env.HTTPS === 'true',

    databaseUrl: process.env.DATABASE_URL || '',
    pgSsl: process.env.PGSSL === 'true',

    gigachat: {
        clientId: process.env.GIGACHAT_CLIENT_ID || '',
        clientSecret: process.env.GIGACHAT_CLIENT_SECRET || '',
        authUrl: process.env.GIGACHAT_AUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        apiUrl: process.env.GIGACHAT_API_URL || 'https://gigachat.devices.sberbank.ru/api/v1',
    },

    aiMock: process.env.AI_MOCK !== 'false',

    csrfSecret: process.env.CSRF_SECRET || 'SECRET_KEY_DEFAULT_00023774323499914999445',

    logLevel: process.env.LOG_LEVEL || 'info',
}