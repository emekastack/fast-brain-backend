import { Router } from "express";
import { courseController } from "./course.module";
import { authenticateJWT } from "../../common/strategies/jwt.strategy";
import { teacherRoute } from "../../middlewares/teacherRoute";
import { uploadImage } from "../../config/multer.config";

const courseRoutes = Router();

// Public routes
courseRoutes.get("/", courseController.getCourses);
courseRoutes.get("/:id", courseController.getCourseById);

// Private routes (Instructor/Admin/Instructor-only as enforced in controller/service)
courseRoutes.post("/", authenticateJWT, teacherRoute, uploadImage.single('image'), courseController.createCourse);
courseRoutes.put("/:id", authenticateJWT, teacherRoute, uploadImage.single('image'), courseController.updateCourse);
courseRoutes.delete("/:id", authenticateJWT, teacherRoute, courseController.deleteCourse);
courseRoutes.get(
  "/instructor/my-courses",
  authenticateJWT,
  courseController.getInstructorCourses
);
courseRoutes.patch(
  "/:id/publish",
  authenticateJWT,
  courseController.toggleCoursePublish
);

export default courseRoutes;
