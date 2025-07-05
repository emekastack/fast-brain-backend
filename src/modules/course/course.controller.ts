import { Request, Response } from "express";
import mongoose from "mongoose";
import { BadRequestException, NotFoundException } from "../../common/utils/catch-errors";
import {
  createCourseSchema,
  updateCourseSchema,
} from "../../common/validators/course.validator";
import { HTTPSTATUS } from "../../config/http.config";
import { uploadAndGetUrl } from "../../config/storj.config";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { CourseService } from "./course.service";

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
    const image = req.file;
    if (!image) {
      throw new BadRequestException("Image is required");
    }

    const imageUrl = await uploadAndGetUrl(image.buffer, image.originalname, "demo-bucket");
    if (!imageUrl) {
      throw new BadRequestException("Failed to upload image");
    }
    const body = createCourseSchema.parse({
      ...req.body,
      instructor: userId.toString(),
      imageUrl
    });

    const course = await this.courseService.createCourse(body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Course created successfully",
      course,
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
      // published,
      instructor,
      search,
    } = req.query;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      category: category as string,
      // published:
      //   published === "true" ? true : published === "false" ? false : undefined,
      instructor: instructor as string,
      search: search as string,
    };

    const result = await this.courseService.getCourses(filters);

    return res.status(HTTPSTATUS.OK).json({
      message: "Courses retrieved successfully",
      ...result,
    });
  });

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

    const course = await this.courseService.updateCourse(id, body, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Course updated successfully",
      course,
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

      const result = await this.courseService.getInstructorCourses(userId, {
        page: Number(page),
        limit: Number(limit),
      });

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

      const course = await this.courseService.toggleCoursePublish(id, userId);

      return res.status(HTTPSTATUS.OK).json({
        message: `Course ${
          course.published ? "published" : "unpublished"
        } successfully`,
        course,
      });
    }
  );
}
