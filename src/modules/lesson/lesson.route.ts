import { Router } from "express";

import { teacherRoute } from "../../middlewares/teacherRoute";
import { lessonController } from "./lesson.module";
import { uploadVideo } from "../../config/multer.config";

const router = Router();
// Public routes
router.get("/courses/:courseId/lessons", lessonController.getLessonsByCourse);
router.get("/:id", lessonController.getLessonById);

// Protected routes (instructor only)
router.post("/", teacherRoute, uploadVideo.single("video"), lessonController.createLesson);
router.put("/:id", teacherRoute, uploadVideo.single("video"), lessonController.updateLesson);
router.delete("/:id", teacherRoute, lessonController.deleteLesson);
router.put("/courses/:courseId/lessons/reorder", teacherRoute, lessonController.reorderLessons);

export default router; 