import { pool } from './pool.js'
import { config } from '../config/env.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url),
 __dirname = dirname(__filename)

export const initDb = async () => {
    if (!config.databaseUrl?.trim()) {
        console.error('DATABASE_URL не задан')
        process.exit(1)
    }

    try {

        //TODO: переработать
        const migrations = [
            'create_classrooms.sql',
            'create_request_logs.sql',
            'add_tokens_approximate.sql',
            'add_grade.sql',
            'add_teacher_token.sql'
        ]

        for (const migration of migrations) {
            const migrationPath = join(__dirname, 'migrations', migration)
            try {
                const sql = readFileSync(migrationPath, 'utf-8')
                await pool.query(sql)
                console.log(`DB - migration applied: ${migration}`)
            } catch (err: any) {
                // пропускаем ошибки о существующих колонках
                if (err.code === '42701' || err.code === '42P07') {
                    console.log(`migrations skipped: ${migration}`)
                } else {
                    throw err
                }
            }
        }

        console.log('db - all migrations completed')
    } catch (err) {
        console.error('db - failed to initialize:', err)
        process.exit(1)
    }
}