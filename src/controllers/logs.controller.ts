import type { Request, Response, NextFunction } from 'express'
import { LogService } from '../services/log.service.js'
import {ClassroomRepository} from "../repositories/classroom.repository.js";

export class LogsController {
    constructor(private logService: LogService,
                private classroomRepo: ClassroomRepository) {}

    getLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const classroomCode = req.query.classroom_code as string

            if (!classroomCode) {
                return res.status(400).json({
                    error: 'classroom_code is required',
                    hint: 'Usage: GET /api/logs?classroom_code=XXXXXX&page=1&limit=20'
                })
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
                    error: 'Access denied. Only the teacher who created this classroom can view logs.'
                })
            }


            const page = parseInt(req.query.page as string) || 1,
             limit = parseInt(req.query.limit as string) || 20

            const result = await this.logService.getLogsByClassroomCodePaginated(classroomCode, page, limit)

            return res.json({
                classroom_code: classroomCode,
                count: result.logs.length,
                total: result.total,
                page: result.page,
                total_pages: result.totalPages,
                limit: limit,
                logs: result.logs
            })
        } catch (error) {
            next(error)
        }
    }
    exportLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const classroomCode = req.query.classroom_code as string

            if (!classroomCode) {
                return res.status(400).json({ error: 'classroom_code is required' })
            }

            const classroom = await this.classroomRepo.findByCode(classroomCode)
            if (!classroom) {
                return res.status(404).json({ error: 'Classroom not found' })
            }

            const csrfToken = req.headers['x-csrf-token'] as string


            const teacherToken = await this.classroomRepo.getTeacherToken(classroomCode)
            if (!teacherToken || csrfToken !== teacherToken) {
                return res.status(403).json({ error: 'Access denied' })
            }

            const logs = await this.logService.getLogsByClassroomCode(classroomCode)

            const headers = [
                'Timestamp',
                'Session ID',
                'Mode',
                'Prompt Hash',
                'Image Attached',
                'Tokens Input',
                'Tokens Output',
                'Tokens Approximate',
                'Status',
                'Response Time (ms)',
                'Error Message'
            ],
             csvRows = [headers.join(',')]

            for (const log of logs) {
                const row = [
                    log.timestamp,
                    log.session_id,
                    log.mode,
                    log.prompt_hash || '',
                    log.image_attached,
                    log.tokens_input || 0,
                    log.tokens_output || 0,
                    log.tokens_is_approximate,
                    log.status,
                    log.response_time_ms,
                    log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : ''
                ]
                csvRows.push(row.join(','))
            }

            const csvContent = csvRows.join('\n')

            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename=logs-${classroomCode}-${Date.now()}.csv`)
            res.send(csvContent)

        } catch (error) {
            next(error)
        }
    }
}