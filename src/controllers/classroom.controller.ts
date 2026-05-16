import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { AppError } from '../utils/errors.js'
import {addMinutes} from "../utils/moscowTime.js";
import { CsrfService } from '../services/csrf.service.js'
import {getWebSocketService} from "../services/websocket.service.js";

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeRoomCode(): string {
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!
    }
    return code
}

export class ClassroomController {
    constructor(
        private classroomRepo: ClassroomRepository,
        private csrfService: CsrfService
    ) {}

    join = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const code = req.params.code as string
            const studentId = req.query.student_id as string || `student-${Date.now()}`

            const classroom = await this.classroomRepo.findByCode(code)
            if (!classroom) {
                return res.status(404).json({ error: 'Classroom not found' })
            }
            if (!classroom.is_active) {
                return res.status(410).json({ error: 'Classroom is not active' })
            }
            if (classroom.expires_at && new Date() > new Date(classroom.expires_at)) {
                return res.status(410).json({ error: 'Classroom has expired' })
            }

            const sessionId = `student-${code}-${studentId}`
            const token = this.csrfService.createToken(sessionId, code, new Date(classroom.expires_at || Date.now() + 86400000))

            res.json({
                token: token,
                classroom_code: code,
                student_id: studentId,
                expires_at: classroom.expires_at,
                message: 'Token valid until classroom expires'
            })
        } catch (error) {
            next(error)
        }
    }

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { title, expires_in_minutes, grade } = req.body as {
                title: string
                expires_in_minutes?: number,
                grade?: number
            }

            const existing = await this.classroomRepo.findByTitle(title)
            if (existing) {
                return res.status(409).json({
                    error: `Classroom with title "${title}" already exists`
                })
            }

            const expiresInMinutes = expires_in_minutes || 1440,
             expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000),
             classGrade = grade || 11

            for (let attempt = 0; attempt < 8; attempt++) {
                const code = makeRoomCode()
                try {
                    const row = await this.classroomRepo.create({
                        id: randomUUID(),
                        code,
                        title,
                        expiresAt,
                        grade: classGrade
                    })

                    // только учительский токен при создании
                    // const teacherSessionId = `teacher-${code}`,
                    //  teacherToken = this.csrfService.createToken(teacherSessionId, code, expiresAt)

                    const creatorToken = req.headers['x-csrf-token'] as string

                    await this.classroomRepo.setTeacherToken(row.id, creatorToken)

                    console.log('[classroom] created', {
                        code: row.code,
                        title: row.title,
                        grade: classGrade,
                        expires_at: expiresAt
                    })

                    return res.status(201).json({
                        id: row.id,
                        code: row.code,
                        title: row.title,
                        is_active: row.is_active,
                        expires_at: row.expires_at,
                        grade: classGrade,
                        expires_in_minutes: expiresInMinutes,
                        teacher_token: creatorToken,
                        message: 'Students join via GET /api/classrooms/' + code + '/join?student_id=1'
                    })
                } catch (e: unknown) {
                    const err = e as { code?: string }
                    if (err.code === '23505') continue
                    throw e
                }
            }

            return res.status(500).json({ error: 'Failed to generate unique code' })
        } catch (error) {
            next(error)
        }
    }

    extend = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const code = req.params.code as string
            const { additional_minutes } = req.body as { additional_minutes: number }

            if (!additional_minutes || additional_minutes < 1 || additional_minutes > 120) {
                return res.status(400).json({
                    error: 'additional_minutes must be between 1 and 120'
                })
            }

            const classroom = await this.classroomRepo.findByCode(code)
            if (!classroom) {
                return res.status(404).json({ error: 'Classroom not found' })
            }

            if (!classroom.is_active) {
                return res.status(410).json({ error: 'Classroom is not active' })
            }
            const csrfToken = req.headers['x-csrf-token'] as string
            const teacherToken = await this.classroomRepo.getTeacherToken(code)

            if (!teacherToken || csrfToken !== teacherToken) {
                return res.status(403).json({
                    error: 'Access denied. Only the teacher who created this classroom can deactivate it.'
                })
            }
            if (classroom.expires_at && new Date() > new Date(classroom.expires_at)) {
                return res.status(410).json({ error: 'Classroom has expired' })
            }

            const updated = await this.classroomRepo.extend(code, additional_minutes)

            if (!updated) {
                return res.status(500).json({ error: 'Failed to extend classroom' })
            }

            if (updated.expires_at) {
                this.csrfService.syncTokensExpiryForClassroom(code, new Date(updated.expires_at))
            }

            res.json({
                code: updated.code,
                old_expires_at: classroom.expires_at,
                new_expires_at: updated.expires_at,
                added_minutes: additional_minutes,
                message: `Classroom extended by ${additional_minutes} minutes. Tokens also extended.`
            })
        } catch (error) {
            next(error)
        }
    }

    deactivate = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const code = req.params.code as string

            if (!code) {
                return res.status(400).json({ error: 'Code is required' })
            }

            const classroom = await this.classroomRepo.findByCode(code as string)

            if (!classroom) {
                return res.status(404).json({ error: 'Classroom not found' })
            }

            const csrfToken = req.headers['x-csrf-token'] as string
            const teacherToken = await this.classroomRepo.getTeacherToken(code)

            if (!teacherToken || csrfToken !== teacherToken) {
                return res.status(403).json({
                    error: 'Access denied. Only the teacher who created this classroom can deactivate it.'
                })
            }

            await this.classroomRepo.deactivate(classroom.id)

            const wsService = getWebSocketService()
            if (wsService) {
                wsService.broadcastClassroomClosed(code as string, 'deactivated')
            }

            res.json({
                message: 'Classroom deactivated',
                code: code,
                is_active: false
            })
        } catch (error) {
            console.error('deactivate error:', error)
            next(error)
        }
    }

}