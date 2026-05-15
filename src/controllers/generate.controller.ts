import type { Request, Response, NextFunction } from 'express'
import { GenerateService } from '../services/generate.service.js'
import { estimateTokens } from "../utils/tokenEstimate.js"
import {GigaChatService} from "../services/ai/gigachat.service.js";

export class GenerateController {
    constructor(
        private generateService: GenerateService,
        private gigaChat: GigaChatService
    ) {}

    generate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const classroomCode = req.headers['x-classroom-code'] as string || req.body.classroom_code
            const { mode, prompt, image, session_id } = req.body

            // формат ответа по тз
            if (mode === 'text') {
                const result = await this.generateService.execute({
                    mode,
                    prompt,
                    classroomCode,
                    image,
                    sessionId: session_id
                })

                const tokens = result.usage || estimateTokens(prompt)
                return res.json({
                    mode: 'text',
                    data: {
                        text: result.text || result.content,
                        tokens: {
                            input: tokens.prompt_tokens || tokens.input || Math.ceil(prompt.length / 4),
                            output: tokens.completion_tokens || tokens.output || Math.ceil((result.text?.length || 0) / 4)
                        },
                        is_approximate: !result.usage
                    }
                })
            }

            if (mode === 'image') {
                const imagePrompt = `Нарисуй ${prompt}`
                const result = await this.generateService.execute({
                    mode: 'image',
                    prompt: imagePrompt,
                    classroomCode,
                    image,
                    sessionId: session_id
                })

                return res.json({
                    mode: 'image',
                    data: {
                        text: result.text,
                        image_id: result.image_id,
                        image_url: `http://localhost:3000/api/generate/images/${result.image_id}`,
                        is_image: true
                    }
                })
            }

            return res.status(400).json({ error: 'Invalid mode' })

        } catch (error) {
            next(error)
        }
    }
    getImage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const imageId = req.params.imageId as string
            const imageBuffer = await this.gigaChat.downloadImage(imageId)

            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.send(imageBuffer)
        } catch (error) {
            next(error)
        }
    }
}