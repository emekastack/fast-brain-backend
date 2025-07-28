import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { HTTPSTATUS } from "../../config/http.config";
import {
  createLessonSchema,
  updateLessonSchema,
} from "../../common/validators/lesson.validator";
import { NotFoundException } from "../../common/utils/catch-errors";
import { LessonService } from "./lesson.service";
import mongoose from "mongoose";

export class LessonController {
  private lessonService: LessonService;

  constructor(lessonService: LessonService) {
    this.lessonService = lessonService;
  }

  /**
   * @desc Create a new lesson
   * @route POST /api/lessons
   * @access Private (Instructor only)
   */
  public createLesson = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const body = createLessonSchema.parse({
      ...req.body,
      video: req.file,
    });

    const lesson = await this.lessonService.createLesson(body, userId);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Lesson created successfully",
      lesson,
    });
  });

  /**
   * @desc Get lessons for a course
   * @route GET /api/courses/:courseId/lessons
   * @access Public
   */
  public getLessonsByCourse = asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new NotFoundException("Invalid course id");
    }

    const lessons = await this.lessonService.getLessonsByCourse(courseId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Lessons retrieved successfully",
      lessons,
    });
  });

  /**
   * @desc Get lesson by ID
   * @route GET /api/lessons/:id
   * @access Public
   */
  public getLessonById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Invalid lesson id");
    }

    const lesson = await this.lessonService.getLessonById(id);

    return res.status(HTTPSTATUS.OK).json({
      message: "Lesson retrieved successfully",
      lesson,
    });
  });

  /**
   * @desc Update lesson
   * @route PUT /api/lessons/:id
   * @access Private (Instructor only)
   */
  public updateLesson = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const body = updateLessonSchema.parse({
      ...req.body,
      video: req.file
    });


    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Invalid lesson id");
    }

    const lesson = await this.lessonService.updateLesson(id, body, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Lesson updated successfully",
      lesson,
    });
  });

  /**
   * @desc Delete lesson
   * @route DELETE /api/lessons/:id
   * @access Private (Instructor only)
   */
  public deleteLesson = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Invalid lesson id");
    }

    await this.lessonService.deleteLesson(id, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Lesson deleted successfully",
    });
  });

  /**
   * @desc Reorder lessons in a course
   * @route PUT /api/courses/:courseId/lessons/reorder
   * @access Private (Instructor only)
   */
  public reorderLessons = asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const userId = (req as any).user.userId;
    const { lessonIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new NotFoundException("Invalid course id");
    }

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      throw new NotFoundException("Lesson IDs array is required");
    }

    // Validate all lesson IDs
    for (const lessonId of lessonIds) {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        throw new NotFoundException("Invalid lesson id in array");
      }
    }

    const lessons = await this.lessonService.reorderLessons(courseId, lessonIds, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Lessons reordered successfully",
      lessons,
    });
  });
} 