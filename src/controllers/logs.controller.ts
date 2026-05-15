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
                    hint: 'Usage: GET /api/logs?classroom_code=XXXXXX'
                })
            }
            const classroom = await this.classroomRepo.findByCode(classroomCode)

            if (!classroom) {
                return res.status(404).json({
                    error: 'Classroom not found',
                    hint: 'Check the classroom code or create a new one'
                })
            }

            const csrfToken = req.headers['x-csrf-token'] as string,
             teacherToken = await this.classroomRepo.getTeacherToken(classroomCode)

            if (!teacherToken || csrfToken !== teacherToken) {
                return res.status(403).json({
                    error: 'Access denied. Only the teacher who created this classroom can view logs.',
                    hint: 'Use the teacher_token received when creating the classroom'
                })
            }

            const logs = await this.logService.getLogsByClassroomCode(classroomCode)

            return res.json({
                classroom_code: classroomCode,
                count: logs.length,
                logs: logs
            })
        } catch (error) {
            next(error)
        }
    }
}