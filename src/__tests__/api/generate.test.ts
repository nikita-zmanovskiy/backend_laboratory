import request from 'supertest'
import { app } from '../../app.js'

describe('POST /api/generate', () => {
    let teacherToken: string,
     classroomCode: string

    beforeAll(async () => {

        const tokenRes = await request(app)
            .get('/api/csrf/token')
            .query({ session_id: 'test-teacher' })
        
        const classRes = await request(app)
            .post('/api/classrooms')
            .set('x-csrf-token', tokenRes.body.csrf_token)
            .send({ title: 'Test Class ' + Date.now(), expires_in_minutes: 10 })
        
        classroomCode = classRes.body.code
        teacherToken = tokenRes.body.csrf_token
    })

    test('text generation works', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', teacherToken)
            .set('x-classroom-code', classroomCode)
            .send({
                mode: 'text',
                prompt: 'Say hello in one word',
                session_id: 'test-teacher'
            })
        
        expect(response.status).toBe(200)
        expect(response.body.mode).toBe('text')
        expect(response.body.data.text).toBeDefined()
    })

    test('image generation works', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', teacherToken)
            .set('x-classroom-code', classroomCode)
            .send({
                mode: 'image',
                prompt: 'Draw a red circle',
                session_id: 'test-teacher'
            })
        
        expect(response.status).toBe(200)
        expect(response.body.mode).toBe('image')
    }, 15000)

    test('empty prompt returns 400', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', teacherToken)
            .set('x-classroom-code', classroomCode)
            .send({
                mode: 'text',
                prompt: '',
                session_id: 'test-teacher'
            })
        
        expect(response.status).toBe(400)
    })

    test('without csrf token returns 403', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-classroom-code', classroomCode)
            .send({
                mode: 'text',
                prompt: 'Test',
                session_id: 'test-teacher'
            })
        
        expect(response.status).toBe(403)
    })

    test('without classroom code returns 400', async () => {
        const response = await request(app)
            .post('/api/generate')
            .set('x-csrf-token', teacherToken)
            .send({
                mode: 'text',
                prompt: 'Test',
                session_id: 'test-teacher'
            })
        
        expect(response.status).toBe(400)
    })
})