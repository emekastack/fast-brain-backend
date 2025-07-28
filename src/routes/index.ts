import { Router } from "express";
import { authenticateJWT } from "../common/strategies/jwt.strategy";
import authRouter from "../modules/auth/auth.route";
import categoryRoutes from "../modules/category/category.route";
import courseRoutes from "../modules/course/course.route";
import lessonRoutes from "../modules/lesson/lesson.route";
import userRoute from "../modules/user/user.route";
import cartRoutes from "../modules/cart/cart.route";

const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/user", authenticateJWT, userRoute);
appRouter.use("/courses", courseRoutes);
appRouter.use("/categories", categoryRoutes);
appRouter.use("/lessons", authenticateJWT, lessonRoutes);
appRouter.use("/cart", cartRoutes);


export default appRouter;
