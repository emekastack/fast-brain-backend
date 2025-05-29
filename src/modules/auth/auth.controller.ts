import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { HTTPSTATUS } from "../../config/http.config";
import { registerSchema } from "../../common/validators/auth.validator";
import { AuthService } from "./auth.service";


export class AuthController {
    private authService: AuthService

    constructor(authService: AuthService) {
        this.authService = authService;
    }
    public register = asyncHandler(
        async (req: Request, res: Response) => {
            const body = registerSchema.parse({
                ...req.body,
            });

            const {user} = await this.authService.register(body);
            return res.status(HTTPSTATUS.CREATED).json({
                message: "User registered successfully",
                data: user
            })
        }
    )
    public login = asyncHandler(
        async (req: Request, res: Response) => {
            // Assuming user authentication is done and user data is available in req.user
            if (!req.user) {
                return res.status(HTTPSTATUS.UNAUTHORIZED).json({
                    error: "Unauthorized"
                });
            }

        }
    );
    // public logout = asyncHandler(
    //     async (req: Request, res: Response) => {
    //         console.log({session: req.session});
    //         console.log({user: req.user});
    //         req.logOut((err) => {
    //             if (err) {
    //                 console.log(err);
    //                 return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    //                     error: "An error occurred while logging out"                        
    //                 })
    //             }  
    //             req.session.destroy((err) => {
    //                 if (err) {
    //                     console.log(err);
    //                     return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    //                         error: "An error occurred while clearing the session"
    //                     });
    //                 }
    //                 return res.status(HTTPSTATUS.OK).json({
    //                     message: "Logged out successfully"
    //                 });
    //             });              
    //         });

    //     }
    // )
}