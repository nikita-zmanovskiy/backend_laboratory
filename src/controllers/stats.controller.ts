import type { Request, Response, NextFunction } from 'express'
import { ClassroomService } from '../services/classroom.service.js'
import { pool } from '../db/pool.js'
import {ClassroomRepository} from "../repositories/classroom.repository.js";
import {csrfService} from "../routes/csrf.routes.js";

export class StatsController {
    constructor(private classroomService: ClassroomService,
                private classroomRepo: ClassroomRepository) {}

    getClassroomStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const classroomCode = req.params.classroomCode as string

            if (!classroomCode) {
                return res.status(400).json({ error: 'classroomCode is required' })
            }
            const classroom = await this.classroomRepo.findByCode(classroomCode)

            if (!classroom) {
                return res.status(404).json({
                    error: 'Classroom not found',
                    hint: 'Check the classroom code or create a new one'
                })
            }

            const csrfToken = req.headers['x-csrf-token'] as string
            const teacherToken = await this.classroomRepo.getTeacherToken(classroomCode)

            if (!teacherToken || csrfToken !== teacherToken) {
                return res.status(403).json({
                    error: 'Access denied. Only the teacher who created this classroom can view stats.'
                })
            }
            const stats = await this.classroomService.getClassroomStats(classroomCode)

            if (!stats || stats.total_requests === 0) {
                return res.json({
                    classroom_code: classroomCode,
                    message: 'No data yet',
                    stats: {
                        total_requests: 0,
                        text_requests: 0,
                        image_requests: 0,
                        errors: 0,
                        avg_response_time: 0,
                        active_sessions: 0
                    }
                })
            }

            res.json({
                classroom_code: classroomCode,
                stats: {
                    total_requests: stats.total_requests,
                    text_requests: stats.text_requests,
                    image_requests: stats.image_requests,
                    errors: stats.errors,
                    avg_response_time_ms: stats.avg_response_time,
                    active_sessions: stats.active_sessions,
                    first_request: stats.first_request,
                    last_request: stats.last_request,
                    error_rate: stats.total_requests > 0
                        ? ((stats.errors / stats.total_requests) * 100).toFixed(1) + '%'
                        : '0%'
                }
            })
        } catch (error) {
            next(error)
        }
    }

    getGlobalStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const csrfToken = req.headers['x-csrf-token'] as string
            if (!csrfToken) {
                return res.status(403).json({
                    error: 'CSRF token is required',
                    hint: 'Get token from GET /api/csrf/token'
                })
            }

            const validation = csrfService.validateToken(csrfToken)

            if (!validation.valid) {
                return res.status(403).json({
                    error: validation.error || 'Invalid or expired CSRF token',
                    hint: 'Get a new token from GET /api/csrf/token'
                })
            }

            const { rows } = await pool.query(`
                SELECT 
                    COUNT(DISTINCT c.id) as total_classrooms,
                    COUNT(DISTINCT CASE WHEN c.is_active THEN c.id END) as active_classrooms,
                    COUNT(rl.id) as total_requests,
                    COUNT(DISTINCT rl.session_id) as total_sessions
                FROM classrooms c
                LEFT JOIN request_logs rl ON rl.classroom_id = c.id
            `)

            res.json({
                global: {
                    total_classrooms: parseInt(rows[0].total_classrooms),
                    active_classrooms: parseInt(rows[0].active_classrooms),
                    total_requests: parseInt(rows[0].total_requests),
                    total_sessions: parseInt(rows[0].total_sessions)
                }
            })
        } catch (error) {
            next(error)
        }
    }
}