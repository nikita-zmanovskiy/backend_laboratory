import type { Request, Response, NextFunction } from 'express'
import { LogService } from '../services/log.service.js'

export class LogsController {
    constructor(private logService: LogService) {}

    getLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const classroomCode = req.query.classroom_code as string

            if (!classroomCode) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: [{
                        field: 'classroom_code',
                        message: 'classroom_code query parameter is required'
                    }]
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