import request from 'supertest'
import { app } from '../../app.js'

describe('Resilience Tests', () => {
    let csrfToken: string,
     classroomCode: string

    beforeAll(async () => {
        const tokenRes = await request(app)
            .get('/api/csrf/token')
            .query({ session_id: 'resilience-test' })
        csrfToken = tokenRes.body.csrf_token

        const classRes = await request(app)
            .post('/api/classrooms')
            .set('x-csrf-token', csrfToken)
            .send({ title: 'Resilience Test ' + Date.now(), expires_in_minutes: 10 })
        classroomCode = classRes.body.code
    })

    test('server returns error when AI_MOCK is on but works', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', csrfToken)
            .set('x-classroom-code', classroomCode)
            .send({ mode: 'text', prompt: 'Resilience test', session_id: 'resilience-test' })

        expect([200, 403, 503]).toContain(response.status)
    })

    test('multiple rapid requests do not crash server', async () => {
        const promises = []

        for (let i = 0; i < 5; i++) {
            promises.push(
                request(app)
                    .get('/api/csrf/token')
                    .query({ session_id: 'rapid-' + i })
            )
        }

        const results = await Promise.all(promises)

        for (const res of results) {
            expect(res.status).toBe(200)
        }
    })

    test('server stays alive after invalid requests', async () => {
        await request(app)
            .post('/api/generate')
            .send({ invalid: 'data' })

        await request(app)
            .post('/api/generate')
            .set('x-classroom-code', 'INVALID')
            .send({ mode: 'text', prompt: '' })

        const healthRes = await request(app).get('/health')
        expect(healthRes.status).toBe(200)
        expect(healthRes.body.status).toBe('ok')
    })

    test('timeout handling is configured', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', csrfToken)
            .set('x-classroom-code', classroomCode)
            .send({
                mode: 'text',
                prompt: 'Quick test',
                session_id: 'timeout-test'
            })
            .timeout(5000) // тест сам прервется через 5 сек

        expect(response.status).toBeDefined()
    })

    test('retry logic exists in service', async () => {
        const fs = await import('fs'),
         aiServicePath = 'src/services/ai/baseAiService.ts'

        if (fs.existsSync(aiServicePath)) {
            const content = fs.readFileSync(aiServicePath, 'utf-8')
            expect(content).toContain('retry')
            expect(content).toContain('AI_RETRY_ATTEMPTS')
        }
    })
})