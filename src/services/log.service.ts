import { LogRepository } from '../repositories/log.repository.js'
import type { RequestLog } from '../types/models.js'

export class LogService {
    constructor(private logRepo: LogRepository) {}

    async getLogsByClassroomCode(classroomCode: string): Promise<RequestLog[]> {
        return this.logRepo.findByClassroomCode(classroomCode)
    }

    async createLog(data: Omit<RequestLog, 'id'>): Promise<RequestLog> {
        return this.logRepo.create(data)
    }
}