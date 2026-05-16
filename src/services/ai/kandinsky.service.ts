import { BaseAiService, AI_RETRY_ATTEMPTS } from './baseAiService.js'
import { config } from '../../config/env.js'
import { AppError } from '../../utils/errors.js'

export class KandinskyService extends BaseAiService {
    constructor() {
        super('Kandinsky', config.gigachat.apiUrl)
    }

    async generate(prompt: string, image?: string | null) {

        //todo: УБРАТЬ/АДАПТИРОВАТЬ МЕТОД - пока не ипользуется
        return
        // if (config.aiMock) {
        //     return this.mock(prompt, image)
        // }
        //
        // const mode = image ? 'image2image' : 'text2image'
        // console.log(`kandinsky - mode: ${mode}`)
        //
        // const payload = image
        //     ? { prompt, image, mode: 'image2image' }
        //     : { prompt, mode: 'text2image' }

        // return this.makeRequestWithRetry({
        //     method: 'POST',
        //     url: '/generate',
        //     headers: {
        //         'X-Key': `Key ${config.kandinsky?.key}`,
        //         'X-Secret': `Secret ${config.kandinsky?.secret}`,
        //         'Content-Type': 'application/json'
        //     },
        //     data: payload
        // })
    }

    private async makeRequestWithRetry(config: any, attempt = 0): Promise<any> {
        try {
            const response = await this.makeRequest(config)
            return {
                image_url: response.url || response.image_url,
                provider: 'kandinsky',
                mode: config.data.mode
            }
        } catch (error) {
            if (attempt < AI_RETRY_ATTEMPTS && error instanceof AppError && error.statusCode === 503) {
                console.log(`kandinsky - retry attempt ${attempt + 1}`)
                await this.delay(Math.pow(2, attempt) * 1000)
                return this.makeRequestWithRetry(config, attempt + 1)
            }
            throw error
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    private mock(prompt: string, image?: string | null) {
        return {
            image_url: 'https://example.com/ai-mock-image.png',
            provider: 'kandinsky-mock',
            mode: image ? 'image2image' : 'text2image',
            prompt_preview: prompt.slice(0, 120),
            image_attached: Boolean(image)
        }
    }
}