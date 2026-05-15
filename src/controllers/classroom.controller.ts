import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { AppError } from '../utils/errors.js'
import {csrfService} from "../routes/csrf.routes.js";
import {addMinutes} from "../utils/moscowTime.js";

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeRoomCode(): string {
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!
    }
    return code
}

export class ClassroomController {
    constructor(private classroomRepo: ClassroomRepository) {}

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { title, expires_in_minutes } = req.body as {
                title: string
                expires_in_minutes?: number
            }

            const existing = await this.classroomRepo.findByTitle(title)
            if (existing) {
                return res.status(409).json({
                    error: `Classroom with title "${title}" already exists`
                })
            }

            const expiresInMinutes = expires_in_minutes || 1440
            const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

            for (let attempt = 0; attempt < 8; attempt++) {
                const code = makeRoomCode()
                try {
                    const row = await this.classroomRepo.create({
                        id: randomUUID(),
                        code,
                        title,
                        expiresAt,
                    })

                    console.log('[classroom] created', {
                        code: row.code,
                        title: row.title,
                        expires_at: expiresAt
                    })

                    return res.status(201).json({
                        id: row.id,
                        code: row.code,
                        title: row.title,
                        is_active: row.is_active,
                        expires_at: row.expires_at,
                        expires_in_minutes: expiresInMinutes
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

    deactivate = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const code = req.params.code

            if (!code) {
                return res.status(400).json({ error: 'Code is required' })
            }

            const classroom = await this.classroomRepo.findByCode(code as string)

            if (!classroom) {
                return res.status(404).json({ error: 'Classroom not found' })
            }

            await this.classroomRepo.deactivate(classroom.id)

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