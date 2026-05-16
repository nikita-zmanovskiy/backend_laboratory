import request from 'supertest'
import { app } from '../../app.js'

describe('GET /api/csrf/token', () => {
    test('returns token', async () => {
        const response = await request(app)
            .get('/api/csrf/token')
            .query({ session_id: 'test-session' })

        expect(response.status).toBe(200)
        expect(response.body.csrf_token).toBeDefined()
        expect(response.body.csrf_token).toMatch(/^[a-f0-9]{64}$/)
        expect(response.body.session_id).toBe('test-session')
        expect(response.body.is_new).toBe(true)
    })

    test('returns same token for same session', async () => {
        const res1 = await request(app)
            .get('/api/csrf/token')
            .query({ session_id: 'same-session' })

        const res2 = await request(app)
            .get('/api/csrf/token')
            .query({ session_id: 'same-session' })

        expect(res1.body.csrf_token).toBe(res2.body.csrf_token)
        expect(res2.body.is_new).toBe(false)
    })
})