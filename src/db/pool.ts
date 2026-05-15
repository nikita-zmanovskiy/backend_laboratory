import { Pool } from 'pg'
import { config } from '../config/env.js'

export const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.pgSsl ? { rejectUnauthorized: false } : false
})