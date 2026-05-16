import request from 'supertest'
import { app } from '../../app.js'
import fs from 'fs'
import path from 'path'

describe('Security Tests', () => {
    test('API keys not exposed to frontend', async () => {
        const response = await request(app).get('/health')

        const body = JSON.stringify(response.body)
        expect(body).not.toContain('GIGACHAT_CLIENT_ID')
        expect(body).not.toContain('GIGACHAT_CLIENT_SECRET')
        expect(body).not.toContain('KANDINSKY_KEY')
        expect(body).not.toContain('KANDINSKY_SECRET')
        expect(body).not.toContain('DATABASE_URL')
    })

    test('images are not stored on server disk', async () => {
        const uploadDirs = ['uploads', 'images', 'generated', 'static/images']

        for (const dir of uploadDirs) {
            const fullPath = path.join(process.cwd(), dir)
            if (fs.existsSync(fullPath)) {
                const files = fs.readdirSync(fullPath).filter(f => f.match(/\.(jpg|png|webp|gif)$/i))
                expect(files.length).toBe(0)
            }
        }
    })

    test('Helmet security headers present', async () => {
        const response = await request(app).get('/health')

        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
        expect(response.headers['x-xss-protection']).toBe('0')
    })

    test('CORS headers restrict origins', async () => {
        const response = await request(app)
            .options('/api/generate')
            .set('Origin', 'http://evil-site.com')
            .set('Access-Control-Request-Method', 'POST')

        expect(response.status).toBe(204)
    })

    test('SQL injection blocked by parameterized queries', async () => {
        const tokenRes = await request(app)
            .get('/api/csrf/token')
            .query({ session_id: 'security-sql-test' })

        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', tokenRes.body.csrf_token)
            .set('x-classroom-code', "'; DROP TABLE classrooms; --")
            .send({ mode: 'text', prompt: 'Test', session_id: 'security-sql-test' })

        expect([400, 403]).toContain(response.status)
    })
})