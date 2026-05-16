import request from 'supertest'
import { app } from '../../app.js'

describe('GET /health', () => {
    test('returns 200 with status ok', async () => {
        const response = await request(app).get('/health')
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('ok')
        expect(response.body.services).toBeDefined()
        expect(response.body.services.api).toBe('healthy')
    })
})
