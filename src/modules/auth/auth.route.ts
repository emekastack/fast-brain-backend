import { Router, Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { HTTPSTATUS } from "../../config/http.config";
import passport from "../../middlewares/passport";

const authRouter = Router();
authRouter.get("/auth/google", passport.authenticate('google', {scope: ['profile', 'email']}));
authRouter.get("/auth/google/callback", passport.authenticate('google', {failureRedirect: '/', session: false}), (req, res) => {
    console.log(req.user);
    res.status(HTTPSTATUS.OK).json({
        message: "Login successful"
    });
    // res.redirect(`${config.APP_ORIGIN}/dashboard`);
})
export default authRouter;