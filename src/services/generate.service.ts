
import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { LogRepository } from '../repositories/log.repository.js'
import { GigaChatService } from './ai/gigachat.service.js'
import { KandinskyService } from './ai/kandinsky.service.js'
import { AppError } from '../utils/errors.js'
import { validateImageSize } from '../utils/imageValidator.js'
import { estimateTokens } from '../utils/tokenEstimate.js'
import { hashPrompt } from "../utils/crypto.js"
import { getWebSocketService } from "./websocket.service.js"

export class GenerateService {
    constructor(
        private classroomRepo: ClassroomRepository,
        private logRepo: LogRepository,
        private gigaChat: GigaChatService,
        private kandinsky: KandinskyService
    ) {}

    async execute(input: any) {
        const startTime = Date.now(),
         tokenData = {
            input: 0,
            output: 0,
            approximate: true
        }

        let status = 200,
            errorMessage: string | null = null,
            result: any = null,
            classroomId: string | null = null

        try {
            const classroom = await this.classroomRepo.findByCode(input.classroomCode)

            if (!classroom) {
                status = 404
                errorMessage = 'Classroom not found'
                throw new AppError(404, errorMessage)
            }

            classroomId = classroom.id

            if (!classroom.is_active) {
                status = 410
                errorMessage = 'Session closed'
                throw new AppError(410, errorMessage)
            }

            if (classroom.expires_at && new Date() > new Date(classroom.expires_at)) {
                status = 410
                errorMessage = 'Classroom has expired'
                await this.classroomRepo.deactivate(classroom.id)
                throw new AppError(410, errorMessage)
            }

            //валидация изображения
            if (input.image) {
                const imageValidation = validateImageSize(input.image)
                if (!imageValidation.valid) {
                    status = 400
                    errorMessage = imageValidation.error!
                    throw new AppError(400, errorMessage)
                }
            }

            const normalizedImage = this.normalizeImageInput(input.image)
            const grade = classroom.grade || 11

            let systemPrompt = 'Ты - помощник для школьников.'

            if (grade <= 6) {
                systemPrompt += ' Отвечай максимально просто, как для ребенка 11-12 лет. Избегай любых тем связанных с насилием, оружием, политикой, взрослыми отношениями, наркотиками. Если вопрос на запрещенную тему - вежливо откажись и предложи безопасную альтернативу.'
            } else if (grade <= 8) {
                systemPrompt += ' Отвечай простым языком для подростков 13-14 лет. Избегай тем насилия, откровенного контента, политических дискуссий. Ограничивай сложность терминологии.'
            } else if (grade <= 9) {
                systemPrompt += ' Избегай откровенных тем и детальных описаний насилия. Используй умеренную сложность языка.'
            }

            if (input.mode === 'text') {
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                result = await this.gigaChat.generate(input.prompt, normalizedImage,systemPrompt)

                if (result.image_support === false && input.image) {
                    result.warning = 'Image processing is not supported in text mode'
                }

                if (result.blocked) {
                    status = 403
                    errorMessage = 'Request blocked by safety filter'
                    throw new AppError(403, result.text || 'Request rejected for safety reasons')
                }

                // подсчет токенов
                console.log(result)
                if (result.usage) {
                    tokenData.input = result.usage.prompt_tokens || 0
                    tokenData.output = result.usage.completion_tokens || 0
                    tokenData.approximate = false
                } else {
                    const inputEstimate = estimateTokens(input.prompt)
                    const outputEstimate = estimateTokens(result.text || '')
                    tokenData.input = inputEstimate.tokens
                    tokenData.output = outputEstimate.tokens
                    tokenData.approximate = true
                }
                console.log(tokenData.approximate)
            } else {
                //генерация изображения
                const imagePrompt = `Нарисуй ${input.prompt}`
                result = await this.gigaChat.generate(imagePrompt, normalizedImage)

                if (result.blocked) {
                    status = 403
                    errorMessage = 'Request blocked by safety filter'
                    throw new AppError(403, result.text || 'Request rejected for safety reasons')
                }

                //подсчет токенов для изобр
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')

                if (result.usage) {
                    tokenData.input = result.usage.prompt_tokens || 0
                    tokenData.output = result.usage.completion_tokens || 0
                    tokenData.approximate = false
                    console.log(tokenData.approximate)
                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')

                }
            }

            return result

        } catch (error) {
            if (error instanceof AppError) {
                throw error
            }
            status = 500
            errorMessage = error instanceof Error ? error.message : 'Internal error'
            throw new AppError(500, errorMessage)
        } finally {
            const responseTime = Date.now() - startTime
            console.log(tokenData.approximate)

            try {
                const logEntry = await this.logRepo.create({
                    timestamp: new Date(),
                    classroom_id: classroomId,
                    session_id: input.sessionId || 'unknown',
                    mode: input.mode || 'unknown',
                    prompt_hash: input.prompt ? hashPrompt(input.prompt) : null,
                    image_attached: Boolean(input.image),
                    tokens_input: tokenData.input,
                    tokens_output: tokenData.output,
                    tokens_is_approximate: tokenData.approximate,
                    status: status,
                    response_time_ms: responseTime,
                    error_message: errorMessage
                })


                if (classroomId) {
                    try {
                        const wsService = getWebSocketService()
                        if (wsService) {
                            wsService.broadcastLog(classroomId, logEntry)
                        }
                    } catch (wsError) {
                        console.error('ws - broadcast error:', wsError)
                    }
                }
            } catch (logError) {
                console.error('Failed to log request:', logError)
            }
        }
    }

    private normalizeImageInput(image: any): string | undefined {
        if (typeof image !== 'string' || !image.trim()) return undefined

        const value = image.trim()
        const validation = validateImageSize(value)
        if (!validation.valid) {
            throw new AppError(400, validation.error!)
        }

        return value
    }
}