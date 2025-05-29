import { Router } from "express";
import { HTTPSTATUS } from "../../config/http.config";
// import passport from "../../middlewares/passport";
import { authController } from "./auth.module";

const authRouter = Router();
    authRouter.post("/register", authController.register);
// authRouter.get("/auth/google", passport.authenticate('google', {scope: ['profile', 'email']}));
// authRouter.get("/auth/google/callback", passport.authenticate('google', {failureRedirect: '/'}), (req, res) => {
//     console.log(req.user);
//     res.status(HTTPSTATUS.OK).json({
//         message: "Login successful"
//     });
//     // res.redirect(`${config.APP_ORIGIN}/dashboard`);
// });
// authRouter.get("/auth/logout", authController.logout);
export default authRouter;