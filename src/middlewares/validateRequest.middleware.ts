
import type { Request, Response, NextFunction } from 'express'
import type { ZodObject } from 'zod'

export const validate = (schema: ZodObject) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            })
            return next()
        } catch (error: any) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors || error.message
            })
        }
    }