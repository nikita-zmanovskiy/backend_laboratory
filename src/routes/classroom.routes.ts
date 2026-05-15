import { Router } from 'express'
import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { ClassroomController } from '../controllers/classroom.controller.js'
import { validate } from '../middlewares/validateRequest.middleware.js'
import { createClassroomSchema } from '../schemas/classroom.schema.js'

const classroomRouter = Router(),
 classroomRepo = new ClassroomRepository(),
 classroomController = new ClassroomController(classroomRepo)

classroomRouter.post('/', validate(createClassroomSchema), classroomController.create)
classroomRouter.post('/:code/deactivate', classroomController.deactivate)
export { classroomRouter }
