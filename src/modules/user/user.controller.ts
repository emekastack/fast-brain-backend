import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { UserService } from "./user.service";
import {
  BadRequestException,
  NotFoundException,
} from "../../common/utils/catch-errors";
import { HTTPSTATUS } from "../../config/http.config";
import { RoleType } from "../../common/enums/role.enum";

export class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
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
    });
  });

  public getQuiz = asyncHandler(async (req: Request, res: Response) => {
    const subject = req.params.subject;
    const userId = (req as any).user.userId;

    if (!subject) {
      throw new BadRequestException("Subject not set.");
    }

    if (!userId) {
      throw new NotFoundException("User ID not found. Please login in.");
    }

    const { data } = await this.userService.getQuiz(userId, subject);

    return res.status(HTTPSTATUS.OK).json({
      message: "Qizz Retrieved Successfully",
      data,
    });
  });

  /**
   * @desc Get all users (Admin only)
   * @route POST /api/courses/:id/enroll
   * @access Private (User only)
   */
  public getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search, role } = req.query;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      role: role as RoleType,
    };
    const users = await this.userService.getAllUsers(filters);
    return res.status(HTTPSTATUS.OK).json({
      message: "Users retrieved successfully",
      ...users,
    });
  });

  /**
   * @desc Get all users (Admin only)
   * @route POST /api/courses/dashboard
   * @access Private (User only)
   */
  public getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const dashboardData = await this.userService.getDashboard();
    return res.status(HTTPSTATUS.OK).json({
      message: "Dashboard data retrieved successfully",
      ...dashboardData,
    });
  });
}
