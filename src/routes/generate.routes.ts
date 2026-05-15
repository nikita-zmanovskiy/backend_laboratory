import { Router } from 'express'
import { GenerateController } from '../controllers/generate.controller.js'
import { GenerateService } from '../services/generate.service.js'
import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { LogRepository } from '../repositories/log.repository.js'
import { GigaChatService } from '../services/ai/gigachat.service.js'
import { KandinskyService } from '../services/ai/kandinsky.service.js'
import { validate } from '../middlewares/validateRequest.middleware.js'
import { generateSchema } from '../schemas/generate.schema.js'

const generateRouter = Router()

const classroomRepo = new ClassroomRepository(),
 logRepo = new LogRepository(),
 gigaChat = new GigaChatService(),
 kandinsky = new KandinskyService(),
 generateService = new GenerateService(classroomRepo, logRepo, gigaChat, kandinsky),
 generateController = new GenerateController(generateService, gigaChat)

generateRouter.post('/', validate(generateSchema), generateController.generate)
generateRouter.get('/images/:imageId', generateController.getImage)

export { generateRouter }