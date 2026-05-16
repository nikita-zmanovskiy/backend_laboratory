import { Router } from 'express'
import { LogsController } from '../controllers/logs.controller.js'
import { LogRepository } from '../repositories/log.repository.js'
import { LogService } from '../services/log.service.js'
import {ClassroomRepository} from "../repositories/classroom.repository.js";

const logsRouter = Router(),
 logRepo = new LogRepository(),
 logService = new LogService(logRepo),
    classroomRepo = new ClassroomRepository(),
 logsController = new LogsController(logService, classroomRepo)

logsRouter.get('/', logsController.getLogs)
logsRouter.get('/export', logsController.exportLogs)
export { logsRouter }