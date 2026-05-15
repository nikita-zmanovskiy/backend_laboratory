import { Router } from 'express'
import { ClassroomRepository } from '../repositories/classroom.repository.js'
import { ClassroomController } from '../controllers/classroom.controller.js'
import { validate } from '../middlewares/validateRequest.middleware.js'
import { createClassroomSchema } from '../schemas/classroom.schema.js'
import {csrfService} from "./csrf.routes.js";

const classroomRouter = Router(),
 classroomRepo = new ClassroomRepository(),
 classroomController = new ClassroomController(classroomRepo, csrfService)

classroomRouter.post('/', validate(createClassroomSchema), classroomController.create)
classroomRouter.post('/:code/deactivate', classroomController.deactivate)
classroomRouter.post('/:code/extend', classroomController.extend)
classroomRouter.get('/:code/join', classroomController.join)
export { classroomRouter }
