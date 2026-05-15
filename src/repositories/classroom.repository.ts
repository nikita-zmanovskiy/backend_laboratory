
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
    async setTeacherToken(id: string, token: string): Promise<void> {
        await pool.query(
            'UPDATE classrooms SET teacher_token = $1 WHERE id = $2',
            [token, id]
        )
    }

    async getTeacherToken(code: string): Promise<string | null> {
        const { rows } = await pool.query(
            'SELECT teacher_token FROM classrooms WHERE UPPER(code) = UPPER($1)',
            [code]
        )
        return rows[0]?.teacher_token || null
    }
    async findByTitle(title: string): Promise<Classroom | null> {
        const { rows } = await pool.query(
            'SELECT * FROM classrooms WHERE title = $1 AND is_active = true LIMIT 1',
            [title]
        )
        return rows[0] || null
    }
    async extend(code: string, additionalMinutes: number): Promise<Classroom | null> {
        const { rows } = await pool.query(`
            UPDATE classrooms 
            SET expires_at = expires_at + ($1 || ' minutes')::INTERVAL
            WHERE UPPER(code) = UPPER($2) AND is_active = true
            RETURNING *
        `, [additionalMinutes, code])

        return rows[0] || null
    }

    async create(data: { id: string; code: string; title: string; expiresAt: Date | null; grade?: number }) {
        const { rows } = await pool.query(
            `INSERT INTO classrooms (id, code, title, expires_at, grade) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [data.id, data.code, data.title, data.expiresAt, data.grade || 11]
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