import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { UserService } from "./user.service";
import { BadRequestException, NotFoundException } from "../../common/utils/catch-errors";
import { HTTPSTATUS } from "../../config/http.config";


export class UserController {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService
    }

    public getSession = asyncHandler(async (req: Request, res: Response) => {
        const sessionId = (req as any).sessionId;

        if (!sessionId) {
            throw new NotFoundException("Session ID not found. Please log in.");
        }

        const user = await this.userService.getSessionById(sessionId);

        return res.status(HTTPSTATUS.OK).json({
            message: "Session Retrieved Successfully",
            user,
        })
    })

    public getQuiz = asyncHandler(async (req: Request, res: Response) => {
        const subject = req.params.subject;
        const userId = (req as any).user.userId;
        // const userId = (req as any).user.userId?.toString().replace(/^new ObjectId\('(.+)'\)$/, "$1");
        // console.log({sessionId, subject})

        if (!subject) {
            throw new BadRequestException("Subject not set.");
        }

        if (!userId) {
            throw new NotFoundException("User ID not found. Please login in.")
        }

        const {data} = await this.userService.getQuiz(userId, subject);

        return res.status(HTTPSTATUS.OK).json({
            message: "Qizz Retrieved Successfully",
            data,
        })

    })
}
