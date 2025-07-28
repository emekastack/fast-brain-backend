import { Router } from "express";
import { courseController } from "./course.module";
import { authenticateJWT } from "../../common/strategies/jwt.strategy";
import { teacherRoute } from "../../middlewares/teacherRoute";
import { uploadImage } from "../../config/multer.config";

const courseRoutes = Router();

// Public routes
courseRoutes.get("/:id", courseController.getCourseById);
courseRoutes.get("/all/courses", courseController.getCourses);

// User routes
courseRoutes.post("/:id/enroll", authenticateJWT, courseController.enrollInCourse);

// Private routes (Instructor/Admin/Instructor-only as enforced in controller/service)
courseRoutes.get("/", authenticateJWT, courseController.getCourses);
courseRoutes.post("/", authenticateJWT, teacherRoute, uploadImage.single('image'), courseController.createCourse);
courseRoutes.put("/:id", authenticateJWT, teacherRoute, uploadImage.single('image'), courseController.updateCourse);
courseRoutes.delete("/:id", authenticateJWT, teacherRoute, courseController.deleteCourse);
courseRoutes.get(
  "/instructor/my-courses",
  authenticateJWT,
  teacherRoute,
  courseController.getInstructorCourses
);
courseRoutes.patch(
  "/:id/publish",
  authenticateJWT,
  teacherRoute,
  courseController.toggleCoursePublish
);

export default courseRoutes;
