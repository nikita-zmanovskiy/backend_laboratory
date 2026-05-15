import axios from 'axios'
import https from 'https'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import { GigaChatAuthService } from './gigachatAuth.service.js'
import { config } from '../../config/env.js'
import { AppError } from '../../utils/errors.js'

function getHttpsAgent(): https.Agent {
    const certPaths = [
        path.join(process.cwd(), 'russian_trusted_root_ca.cer'),
        path.join(process.cwd(), 'src/tests/russian_trusted_root_ca.cer'),
    ]

    for (const certPath of certPaths) {
        if (fs.existsSync(certPath)) {
            return new https.Agent({ ca: fs.readFileSync(certPath) })
        }
    }

    return new https.Agent({ rejectUnauthorized: false })
}

interface UploadedFile {
    id: string
    object: string
    bytes: number
    created_at: number
    filename: string
    purpose: string
}

export class GigaChatFilesService {
    private authService: GigaChatAuthService
    private httpsAgent: https.Agent

    constructor() {
        this.authService = new GigaChatAuthService()
        this.httpsAgent = getHttpsAgent()
    }

    async uploadImage(base64Image: string, fileName: string = 'image.png'): Promise<string> {
        const token = await this.authService.getAccessToken()

        // конвертируем base64 в buffer
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, ''),
         buffer = Buffer.from(base64Data, 'base64')

        const form = new FormData()
        form.append('file', buffer, {
            filename: fileName,
            contentType: 'image/png'
        })
        form.append('purpose', 'general')

        try {
            console.log('gigaChat - uploading image')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')

            const response = await axios.post(
                `${config.gigachat.apiUrl}/files`,
                form,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        ...form.getHeaders()
                    },
                    httpsAgent: this.httpsAgent,
                    timeout: 30000,
                    maxContentLength: 10 * 1024 * 1024, // 10мб TODO: изменить на 5 мб
                    maxBodyLength: 10 * 1024 * 1024
                }
            )

            const file: UploadedFile = response.data
            console.log('gigaChat files - uploaded:', file.id)
            return file.id

        } catch (error: any) {
            console.error('gigaChat files - upload error:', error.response?.status, error.response?.data)
            throw new AppError(400, `failed to upload image: ${error.response?.data?.message || error.message}`)
        }
    }

    async deleteFile(fileId: string): Promise<void> {
        const token = await this.authService.getAccessToken()

        try {
            await axios.delete(`${config.gigachat.apiUrl}/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                httpsAgent: this.httpsAgent,
                timeout: 10000
            })
            console.log('gigaChat files - deleted:', fileId)
        } catch (error: any) {
            console.error('gigaChat files - delete error:', error.message)
        }
    }
}