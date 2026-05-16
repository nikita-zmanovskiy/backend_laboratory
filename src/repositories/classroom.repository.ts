
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
        error_rate: string
        top_students: Array<{ session_id: string; requests: number; avg_tokens: number }>
        charts: {
            tokens_over_time: Array<{ timestamp: string; input: number; output: number }>
            requests_per_minute: Array<{ minute: string; count: number }>
            mode_distribution: { text: number; image: number }
            avg_tokens_per_request: number
            avg_response_time: number
            error_rate: number
            total_requests: number
            active_students: number
        }
    }> {
        console.log('DEBUG!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
        // базовая статистика
        const basicStats = await pool.query(`
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

        const s = basicStats.rows[0]
        const errorRate = s.total_requests > 0
            ? ((s.errors / s.total_requests) * 100).toFixed(1) + '%'
            : '0%'

        // топ учеников по запросам
        const topStudents = await pool.query(`
        SELECT 
            session_id,
            COUNT(*)::INTEGER as requests,
            AVG(tokens_input + tokens_output)::INTEGER as avg_tokens
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1)
        GROUP BY session_id
        ORDER BY requests DESC
        LIMIT 10
    `, [code])

        // график токенов по времени
        const tokensOverTime = await pool.query(`
        SELECT 
            date_trunc('minute', timestamp) as minute,
            AVG(tokens_input)::INTEGER as avg_input,
            AVG(tokens_output)::INTEGER as avg_output
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1) AND tokens_input > 0
        GROUP BY minute
        ORDER BY minute
    `, [code])

        // запросы по минутам
        const requestsPerMinute = await pool.query(`
        SELECT 
            to_char(date_trunc('minute', timestamp), 'HH24:MI') as minute,
            COUNT(*)::INTEGER as count
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1)
        GROUP BY date_trunc('minute', timestamp)
        ORDER BY date_trunc('minute', timestamp)
    `, [code])

        // распределение по режимам
        const modeDist = await pool.query(`
        SELECT 
            COUNT(CASE WHEN mode = 'text' THEN 1 END)::INTEGER as text_count,
            COUNT(CASE WHEN mode = 'image' THEN 1 END)::INTEGER as image_count
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1)
    `, [code])

        // средние токены
        const avgTokens = await pool.query(`
        SELECT 
            AVG(tokens_input + tokens_output)::INTEGER as avg_tokens
        FROM request_logs rl
        JOIN classrooms c ON rl.classroom_id = c.id
        WHERE UPPER(c.code) = UPPER($1) AND tokens_input > 0
    `, [code])

        return {
            total_requests: parseInt(s.total_requests),
            text_requests: parseInt(s.text_requests),
            image_requests: parseInt(s.image_requests),
            errors: parseInt(s.errors),
            avg_response_time: s.avg_response_time,
            active_sessions: parseInt(s.active_sessions),
            first_request: s.first_request,
            last_request: s.last_request,
            error_rate: errorRate,

            top_students: topStudents.rows.map(r => ({
                session_id: r.session_id,
                requests: parseInt(r.requests),
                avg_tokens: r.avg_tokens || 0
            })),

            charts: {
                tokens_over_time: tokensOverTime.rows.map(r => ({
                    timestamp: r.minute,
                    input: r.avg_input,
                    output: r.avg_output
                })),
                requests_per_minute: requestsPerMinute.rows.map(r => ({
                    minute: r.minute,
                    count: r.count
                })),
                mode_distribution: {
                    text: parseInt(modeDist.rows[0].text_count),
                    image: parseInt(modeDist.rows[0].image_count)
                },
                avg_tokens_per_request: avgTokens.rows[0]?.avg_tokens || 0,
                avg_response_time: s.avg_response_time,
                error_rate: parseFloat(errorRate),
                total_requests: parseInt(s.total_requests),
                active_students: parseInt(s.active_sessions)
            }
        }
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