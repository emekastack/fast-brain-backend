import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { HTTPSTATUS } from "../../config/http.config";


export class AuthController {
    public logout = asyncHandler(
        async (req: Request, res: Response) => {
            console.log({session: req.session});
            console.log({user: req.user});
            req.logOut((err) => {
                if (err) {
                    console.log(err);
                    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
                        error: "An error occurred while logging out"                        
                    })
                }  
                req.session.destroy((err) => {
                    if (err) {
                        console.log(err);
                        return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
                            error: "An error occurred while clearing the session"
                        });
                    }
                    return res.status(HTTPSTATUS.OK).json({
                        message: "Logged out successfully"
                    });
                });              
            });
            
        }
    )
}