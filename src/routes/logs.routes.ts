import { Router } from 'express'
import { LogsController } from '../controllers/logs.controller.js'
import { LogRepository } from '../repositories/log.repository.js'
import { LogService } from '../services/log.service.js'

const logsRouter = Router(),
 logRepo = new LogRepository(),
 logService = new LogService(logRepo),
 logsController = new LogsController(logService)

logsRouter.get('/', logsController.getLogs)

export { logsRouter }