import { Router } from "express";
import { userController } from "./user.module";
import { teacherRoute } from "../../middlewares/teacherRoute";

const userRoute = Router();

userRoute.get("/session", userController.getSession);
userRoute.get("/quiz/:subject", userController.getQuiz);

// admin route
userRoute.get("/", teacherRoute, userController.getAllUsers);
userRoute.get("/dashboard", teacherRoute, userController.getDashboard);
// userRoute.get("/:id", teacherRoute, userController.getUserById);

export default userRoute;
