import { Request, Response, Router } from "express";
import authRouter from "../modules/auth/auth.route";

const appRouter = Router();

appRouter.use(authRouter);

export default appRouter;