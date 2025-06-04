import { Router } from "express";


const userRoute = Router();

userRoute.get("/", (req, res) => {
    res.status(200).json({
        message: "User route is working",
        user: req.user // Assuming user info is attached to the request
    });
});

export default userRoute;