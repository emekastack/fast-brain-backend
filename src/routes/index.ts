import { Request, Response, Router } from "express";
import authRouter from "../modules/auth/auth.route";
import isAuthenticated from "../middlewares/isAuthenticated";

const appRouter = Router();

appRouter.use("/auth",authRouter);
appRouter.get("/user", isAuthenticated)

export default appRouter;