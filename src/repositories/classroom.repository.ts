
import { pool } from '../db/pool.js'
import type { Classroom } from '../types/models.js';

export class ClassroomRepository {
    async findByCode(code: string): Promise<Classroom | null> {
        const { rows } = await pool.query(
            'SELECT * FROM classrooms WHERE UPPER(code) = UPPER($1) LIMIT 1',
            [code]
        )
        return rows[0] || null
    }
    async getStats(code: string): Promise<{
        total_requests: number
        text_requests: number
        image_requests: number
        errors: number
        avg_response_time: number
        active_sessions: number
        first_request: Date | null
        last_request: Date | null
    } | null> {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*)::INTEGER as total_requests,
                COUNT(CASE WHEN mode = 'text' THEN 1 END)::INTEGER as text_requests,
                COUNT(CASE WHEN mode = 'image' THEN 1 END)::INTEGER as image_requests,
                COUNT(CASE WHEN status >= 400 THEN 1 END)::INTEGER as errors,
                COALESCE(AVG(response_time_ms)::INTEGER, 0) as avg_response_time,
                COUNT(DISTINCT session_id)::INTEGER as active_sessions,
                MIN(timestamp) as first_request,
                MAX(timestamp) as last_request
            FROM request_logs rl
                     JOIN classrooms c ON rl.classroom_id = c.id
            WHERE UPPER(c.code) = UPPER($1)
        `, [code])

        return rows[0] || null
    }
    async findByTitle(title: string): Promise<Classroom | null> {
        const { rows } = await pool.query(
            'SELECT * FROM classrooms WHERE title = $1 AND is_active = true LIMIT 1',
            [title]
        )
        return rows[0] || null
    }

    async create(data: { id: string; code: string; title: string; expiresAt: Date | null }) {
        const { rows } = await pool.query(
            `INSERT INTO classrooms (id, code, title, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
            [data.id, data.code, data.title, data.expiresAt]
        )
        return rows[0]
    }

    async deactivate(id: string): Promise<void> {
        await pool.query(
            'UPDATE classrooms SET is_active = false WHERE id = $1',
            [id]
        )
    }
}