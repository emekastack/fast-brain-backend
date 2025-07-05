import { LessonController } from "./lesson.controller";
import { LessonService } from "./lesson.service";


const lessonService = new LessonService();
const lessonController = new LessonController(lessonService);

export { lessonService, lessonController };
