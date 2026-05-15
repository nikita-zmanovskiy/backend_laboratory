// src/schemas/classroom.schema.ts
import { z } from 'zod'

export const createClassroomSchema = z.object({
    body: z.object({
        title: z.string()
            .min(1, 'Title cannot be empty')
            .max(100, 'Title is too long (max 100 characters)'),
        expires_in_minutes: z.number()
            .int()
            .min(1, 'Minimum 1 minute')
            .max(10080, 'Maximum 1 week (10080 minutes)')
            .optional()
            .default(1440),
        grade: z.number().int().min(5).max(11).optional().default(11)
    })
})