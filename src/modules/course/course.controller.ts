import { Request, Response } from "express";
import mongoose from "mongoose";
import { NotFoundException } from "../../common/utils/catch-errors";
import {
  createCourseSchema,
  updateCourseSchema,
} from "../../common/validators/course.validator";
import { HTTPSTATUS } from "../../config/http.config";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { CourseService } from "./course.service";
import { Roles } from "../../common/enums/role.enum";
import { UnauthorizedException } from "../../common/utils/catch-errors";

export class CourseController {
  private courseService: CourseService;

  constructor(courseService: CourseService) {
    this.courseService = courseService;
  }

  /**
   * @desc Create a new course
   * @route POST /api/courses
   * @access Private (Instructor only)
   */
  public createCourse = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const body = createCourseSchema.parse({
      ...req.body,
      instructor: userId.toString(),
      imageUrl: req.file,
    });

    const { courseId } = await this.courseService.createCourse(body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Course created successfully",
      courseId,
    });
  });

  /**
   * @desc Get all courses
   * @route GET /api/courses
   * @access Public
   */
  public getCourses = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      category,
      published,
      instructor,
      search,
    } = req.query;

    const userRole = (req as any).user?.role;

    let publishedFilter: boolean | undefined;
    if (userRole === Roles.ADMIN) {
      publishedFilter =
        published == "true" ? true : published == "false" ? false : undefined;
    } else {
      publishedFilter = undefined;
    }

    const filters = {
      page: Number(page),
      limit: Number(limit),
      category: category as string,
      published: publishedFilter,
      instructor: instructor as string,
      search: search as string,
    };

    const response = await this.courseService.getCourses(filters);

    return res.status(HTTPSTATUS.OK).json({
      message: "Courses retrieved successfully",
      ...response,
    });
  });

  /**
   * @desc Get all Enrolledc ourses
   * @route GET /api/courses/user/enrolled-courses
   * @access Public
   */
  public getEnrolledCourses = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = (req as any).user.userId;
      const { page = 1, limit = 10, category, isCompleted, search } = req.query;

      const isCompleteFilter =
        isCompleted == "true"
          ? true
          : isCompleted == "false"
            ? false
            : undefined;

      const filters = {
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        search: search as string,
        isCompleted: isCompleteFilter,
      };

      const response = await this.courseService.getCourseEnrolled(
        userId,
        filters
      );

      return res.status(HTTPSTATUS.OK).json({
        message: "Courses retrieved successfully",
        ...response,
      });
    }
  );

  /**
   * @desc Get a single enrolled course for a user
   * @route GET /api/courses/enrolled-course/:id
   * @access Private
   */
  public getEnrolledCourse = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = (req as any).user.userId;
      const { id } = req.params;

      const response = await this.courseService.getEnrolledCourse(
        userId,
        id
      );

      return res.status(HTTPSTATUS.OK).json({
        message: "Enrolled course retrieved successfully",
        ...response,
      });
    }
  );

  /**
   * @desc Get course by ID
   * @route GET /api/courses/:id
   * @access Public
   */
  public getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Invalid course id");
    }
    const course = await this.courseService.getCourseById(id);
    if (!course) {
      throw new NotFoundException("Course not found");
    }
    return res.status(HTTPSTATUS.OK).json({
      message: "Course retrieved successfully",
      course,
    });
  });

  /**
   * @desc Update course
   * @route PUT /api/courses/:id
   * @access Private (Instructor/Admin only)
   */
  public updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const body = updateCourseSchema.parse({
      ...req.body,
      imageUrl: req.file || null,
    });

    const { message } = await this.courseService.updateCourse(id, body, userId);

    return res.status(HTTPSTATUS.OK).json({
      message,
    });
  });

  /**
   * @desc Delete course
   * @route DELETE /api/courses/:id
   * @access Private (Instructor/Admin only)
   */
  public deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    await this.courseService.deleteCourse(id, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Course deleted successfully",
    });
  });

  /**
   * @desc Get instructor's courses
   * @route GET /api/courses/instructor/my-courses
   * @access Private (Instructor only)
   */
  public getInstructorCourses = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = (req as any).user.userId;
      const { page = 1, limit = 10 } = req.query;

      const result = await this.courseService.getInstructorCourses(
        userId.toString(),
        {
          page: Number(page),
          limit: Number(limit),
        }
      );

      return res.status(HTTPSTATUS.OK).json({
        message: "Instructor courses retrieved successfully",
        ...result,
      });
    }
  );

  /**
   * @desc Publish/Unpublish course
   * @route PATCH /api/courses/:id/publish
   * @access Private (Instructor/Admin only)
   */
  public toggleCoursePublish = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const { message } = await this.courseService.toggleCoursePublish(
        id,
        userId
      );

      return res.status(HTTPSTATUS.OK).json({
        message,
      });
    }
  );

  /**
   * @desc Enroll user in a course
   * @route POST /api/courses/:id/enroll
   * @access Private (User only)
   */
  public enrollInCourse = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { id: courseId } = req.params;

    const response = await this.courseService.enrollUserInCourse(
      courseId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      ...response,
    });
  });

  /**
   * @desc Get published course for user
   * @route POST /api/courses/all/user-courses
   * @access Private (User only)
   */
  public getUserCourse = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search, category } = req.query;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      category: category as string,
      published: true,
      search: search as string,
    };

    const response = await this.courseService.getCourses(filters);

    return res.status(HTTPSTATUS.OK).json({
      message: "Courses retrieved successfully",
      ...response,
    });
  });
}
