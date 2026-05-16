import { pool } from '../db/pool.js'
import type { RequestLog } from '../types/models.js'

export class LogRepository {
    async findByClassroomCode(classroomCode: string): Promise<RequestLog[]> {
        const { rows } = await pool.query(`
            SELECT rl.* 
            FROM request_logs rl
            JOIN classrooms c ON rl.classroom_id = c.id
            WHERE UPPER(c.code) = UPPER($1)
            ORDER BY rl.timestamp DESC
            LIMIT 100
        `, [classroomCode])

        return rows
    }
    async findByClassroomCodePaginated(
        classroomCode: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ logs: RequestLog[]; total: number; page: number; totalPages: number }> {
        const offset = (page - 1) * limit

        const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1)
    `, [classroomCode])

        const total = parseInt(countResult.rows[0].total)
        const totalPages = Math.ceil(total / limit)

        const { rows } = await pool.query(`
        SELECT rl.* 
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1)
        ORDER BY rl.timestamp DESC
        LIMIT $2 OFFSET $3
    `, [classroomCode, limit, offset])

        return {
            logs: rows,
            total,
            page,
            totalPages
        }
    }
    async create(log: Omit<RequestLog, 'id'>): Promise<RequestLog> {
        console.log(log)
        const { rows } = await pool.query(`
            INSERT INTO request_logs (
                timestamp, classroom_id, session_id, mode, 
                prompt_hash, image_attached, tokens_input, 
                tokens_output,tokens_is_approximate, status, response_time_ms, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            log.timestamp,
            log.classroom_id,
            log.session_id,
            log.mode,
            log.prompt_hash,
            log.image_attached,
            log.tokens_input,
            log.tokens_output,
            log.tokens_is_approximate,
            log.status,
            log.response_time_ms,
            log.error_message,
        ])
        console.log(rows)
        return rows[0]
    }
}