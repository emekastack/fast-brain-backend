import { NextFunction, Request, Response } from "express";

const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
    console.log({object: req.user});
    res.status(200).json({
        user: req.user
    });
}

export default isAuthenticated;