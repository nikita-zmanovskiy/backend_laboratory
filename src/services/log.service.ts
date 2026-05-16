import { LogRepository } from '../repositories/log.repository.js'
import type { RequestLog } from '../types/models.js'

export class LogService {
    constructor(private logRepo: LogRepository) {}

    async getLogsByClassroomCode(classroomCode: string): Promise<RequestLog[]> {
        return this.logRepo.findByClassroomCode(classroomCode)
    }
    async getLogsByClassroomCodePaginated(
        classroomCode: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ logs: RequestLog[]; total: number; page: number; totalPages: number }> {
        return this.logRepo.findByClassroomCodePaginated(classroomCode, page, limit)
    }

    async createLog(data: Omit<RequestLog, 'id'>): Promise<RequestLog> {
        return this.logRepo.create(data)
    }
}