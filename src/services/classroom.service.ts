import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { pool } from '../db/pool.js'
import {getMoscowTime} from "../utils/moscowTime.js";

export class ClassroomService {
    constructor(private classroomRepo: ClassroomRepository) {}


    async getOrCreateClassroom(sessionId: string, title?: string): Promise<{
        code: string
        isNew: boolean
        title: string
        expiresAt: Date
    }> {
        const code = this.generateClassroomCode(),
         now = new Date(),
         expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 ч

        const classroom = await this.classroomRepo.create({
            id: crypto.randomUUID(),
            code,
            title: title || `Session ${sessionId.substring(0, 8)}`,
            expiresAt
        })

        return {
            code: classroom.code,
            isNew: true,
            title: classroom.title,
            expiresAt: expiresAt
        }
    }

    async getClassroomStats(code: string): Promise<{
        total_requests: number
        text_requests: number
        image_requests: number
        errors: number
        avg_response_time: number
        active_sessions: number
        first_request: Date | null
        last_request: Date | null
    } | null> {
        const stats = await this.classroomRepo.getStats(code)
        return stats
    }

    private generateClassroomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)]
        }
        return code
    }

    async cleanupExpiredClassrooms() {
        try {
            const result = await pool.query(`
            UPDATE classrooms 
            SET is_active = false 
            WHERE is_active = true 
            AND expires_at IS NOT NULL 
            AND expires_at < NOW()  -- Используем NOW() PostgreSQL (UTC)
        `)

            const rowCount = result.rowCount ?? 0
            if (rowCount > 0) {
                console.log(`cleanup - deactivated ${rowCount} expired classrooms`)
            }
        } catch (error) {
            console.error('cleanup - error:', error)
        }
    }
}