import { Router, Request, Response } from 'express'
import { pool } from '../db/pool.js'
import {getMoscowISOString} from "../utils/moscowTime.js";
import {RequestQueueService} from "../services/ai/requestQueue.service.js";

const healthRouter = Router()

healthRouter.get('/', async (req: Request, res: Response) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        moscow_time: getMoscowISOString(),
        uptime: process.uptime(),
        services: {
            api: 'healthy',
            database: 'unknown'
        }
    }

    try {
        await pool.query('SELECT 1') // проверка что бд работает
        health.services.database = 'healthy'
    } catch (error) {
        health.services.database = 'unhealthy'
        health.status = 'degraded'
    }

    const statusCode = health.status === 'ok' ? 200 : 503
    res.status(statusCode).json(health)
})

// healthRouter.get('/queue', (req, res) => {
//     res.json({
//         queue_size: RequestQueueService.getQueueSize()
//     })
// })
export { healthRouter }