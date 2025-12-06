import mongoose from "mongoose";
import { ErrorCode } from "../../common/enums/error-code.enum";
import {
  CourseEnrollFilters,
  CourseFilters,
  CreateCourseDto,
  UpdateCourseDto,
} from "../../common/interface/course.interface";
import {
  BadRequestException,
  NotFoundException,
} from "../../common/utils/catch-errors";
import { deleteFile, uploadAndGetUrl } from "../../config/cloudinary.config";
import CategoryModel from "../../database/models/category.model";
import CourseModel from "../../database/models/course.model";
import EnrollmentModel from "../../database/models/enrollment.model";
import UserModel from "../../database/models/user.model";
import LessonModel from "../../database/models/lesson.model";
import redisClient from '../../redis.client';

export class CourseService {
  /**
   * Create a new course
   */
  public async createCourse(courseData: CreateCourseDto) {
    const { title, categoryId, instructor } = courseData;

    // Verify instructor exists
    const instructorExists = await UserModel.findById(instructor);
    if (!instructorExists) {
      throw new NotFoundException("Instructor not found");
    }

    // Verify category exists
    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Check if course with same title already exists for this instructor
    const existingCourse = await CourseModel.findOne({
      title: { $regex: new RegExp(`^${title}$`, "i") },
      instructor,
    });

    if (existingCourse) {
      throw new BadRequestException(
        "You already have a course with this title",
        ErrorCode.VALIDATION_ERROR
      );
    }

    let image;
    if (courseData.imageUrl) {
      image = await uploadAndGetUrl(
        courseData.imageUrl.buffer,
        courseData.imageUrl.originalname,
        "demo-bucket"
      );
    }

    if (!image) {
      throw new BadRequestException("Course image is required");
    }
    // Create course with category info embedded
    const course = await CourseModel.create({
      ...courseData,
      imageUrl: image,
      category: {
        _id: category._id,
        name: category.name,
      },
    });
    return { courseId: course.id };
  }

  /**
   * Get all courses with filters and pagination
   */
  public async getCourses(filters: CourseFilters) {
    const { page, limit, category, instructor, search, published } = filters;

    // Build query
    const query: any = {};

    if (typeof published === "boolean") {
      query.published = published;
    }

    if (category) {
      query["category._id"] = category;
    }

    if (instructor) {
      query.instructor = instructor;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get courses with enrolledCount using aggregation
    const courses = await CourseModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $addFields: {
          enrolledCount: { $size: "$enrollments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "instructor",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
      {
        $addFields: {
          instructorName: { $arrayElemAt: ["$instructorInfo.name", 0] },
        },
      },
      {
        $project: {
          title: 1,
          category: 1,
          imageUrl: 1,
          enrolledCount: 1,
          price: 1,
          published: 1,
          instructorName: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
      // You can use 1 for ascending or -1 for descending
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const total = await CourseModel.countDocuments(query);

    return {
      courses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCourses: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get all enrolled course
   */
  public async getCourseEnrolled(userId: string, filter: CourseEnrollFilters) {
    const { limit, page, search, category, isCompleted } = filter;

    const skip = (page - 1) * limit;

    // Base $match filter
    const baseMatch = {
      user: new mongoose.Types.ObjectId(userId),
    };

    // Build common filtering pipeline stages
    const filterStages: any[] = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      // ✅ Filter to only published courses
      {
        $match: {
          "course.published": true,
        },
      },
      ...(search || category
        ? [
          {
            $match: {
              ...(search && {
                "course.title": { $regex: search, $options: "i" },
              }),
              ...(category && {
                "course.category._id": new mongoose.Types.ObjectId(category),
              }),
            },
          },
        ]
        : []),
      {
        $lookup: {
          from: "users",
          localField: "course.instructor",
          foreignField: "_id",
          as: "instructor",
        },
      },
      { $unwind: "$instructor" },
      {
        $lookup: {
          from: "lessons",
          let: { courseId: "$course._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$courseId", "$$courseId"] } } },
            { $count: "lessonCount" },
          ],
          as: "lessonData",
        },
      },
      {
        $addFields: {
          lessonCount: {
            $ifNull: [{ $arrayElemAt: ["$lessonData.lessonCount", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          completedLessonsCount: { $size: "$completedLessons" },
        },
      },
      ...(typeof isCompleted === "boolean"
        ? [
          {
            $match: {
              $expr: {
                [isCompleted ? "$eq" : "$ne"]: [
                  {
                    $cond: {
                      if: { $isArray: "$completedLessons" },
                      then: { $size: "$completedLessons" },
                      else: 0,
                    },
                  },
                  "$lessonCount",
                ],
              },
            },
          },
        ]
        : []),
    ];

    // Now create main pipeline with pagination and projection
    const enrolledCourses = await EnrollmentModel.aggregate([
      ...filterStages,
      {
        $addFields: {
          completedLessonsCount: {
            $cond: {
              if: { $isArray: "$completedLessons" },
              then: { $size: "$completedLessons" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          courseId: "$course._id",
          title: "$course.title",
          imageUrl: "$course.imageUrl",
          instructorName: "$instructor.name",
          lessonCount: 1,
          completedLessons: 1,
          completedLessonsCount: "$completedLessonsCount",
          category: "$course.category.name",
          updatedAt: 1,
          progress: {
            $cond: {
              if: { $gt: ["$lessonCount", 0] },
              then: {
                $multiply: [
                  { $divide: ["$completedLessonsCount", "$lessonCount"] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Use same filters to count
    const countResult = await EnrollmentModel.aggregate([
      ...filterStages,
      { $count: "total" },
    ]);

    const total = countResult[0]?.total || 0;

    return {
      enrolledCourses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCourses: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single enrolled course for a user
   */
  public async getEnrolledCourse(userId: string, courseId: string) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException("Invalid course ID");
    }

    const enrollment = await EnrollmentModel.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      throw new NotFoundException("Enrolled course not found");
    }

    const courseDetails = await CourseModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "courseId",
          as: "lessons",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "instructor",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $addFields: {
          instructor: { $arrayElemAt: ["$instructorInfo.name", 0] },
          enrollmentCount: { $size: "$enrollments" },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          instructor: 1,
          category: 1,
          imageUrl: 1,
          published: 1,
          price: 1,
          createdAt: 1,
          updatedAt: 1,
          lessons: {
            _id: 1,
            title: 1,
            content: 1,
            videoUrl: 1,
            duration: 1,
          },
          enrollmentCount: 1,
        },
      },
    ]);

    if (courseDetails.length === 0) {
      throw new NotFoundException("Course not found");
    }

    const course = courseDetails[0];

    return {
      course: {
        ...course,
        completedLessons: enrollment.completedLessons,
      },
    };
  }

  /**
   * Get course by ID
   */
  public async getCourseById(courseId: string) {
    const course = await CourseModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $addFields: {
          enrolledCount: { $size: "$enrollments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "instructor",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
      {
        $addFields: {
          instructorName: { $arrayElemAt: ["$instructorInfo.name", 0] },
        },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "courseId",
          as: "lessons",
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          imageUrl: 1,
          published: 1,
          price: 1,
          enrolledCount: 1,
          instructorName: 1,
          createdAt: 1,
          updatedAt: 1,
          lessons: 1,
        },
      },
    ]);

    if (!course || course.length === 0) {
      throw new NotFoundException("Course not found");
    }

    return course[0];
  }

  /**
   * Update course
   */
  public async updateCourse(
    courseId: string,
    updateData: UpdateCourseDto,
    userId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException("Invalid course ID");
    }
    const course = await CourseModel.findById(courseId);

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // Check if user is the instructor of this course
    if (course.instructor.toString() !== userId.toString()) {
      throw new BadRequestException("You can only update your own courses");
    }

    const dataToUpdate: any = {};
    // If category is being updated, verify it exists and update embedded category
    if (updateData.categoryId) {
      const category = await CategoryModel.findById(updateData.categoryId);
      if (!category) {
        throw new NotFoundException("Category not found");
      }

      dataToUpdate.category = {
        _id: category._id,
        name: category.name,
      };
    }

    // If title is being updated, check for duplicates
    if (updateData.title && updateData.title !== course.title) {
      const existingCourse = await CourseModel.findOne({
        title: { $regex: new RegExp(`^${updateData.title}$`, "i") },
        instructor: userId,
        _id: { $ne: courseId },
      });

      if (existingCourse) {
        throw new BadRequestException(
          "You already have a course with this title",
          ErrorCode.VALIDATION_ERROR
        );
      }
    }

    if (updateData.imageUrl) {
      const existingFilename = course.imageUrl.split("/").pop();
      await uploadAndGetUrl(
        updateData.imageUrl.buffer,
        updateData.imageUrl.originalname,
        "demo-bucket",
        existingFilename
      );
    }

    dataToUpdate.title = updateData.title;
    dataToUpdate.description = updateData.description;
    dataToUpdate.price = updateData.price;

    await CourseModel.findByIdAndUpdate(courseId, { $set: dataToUpdate });

    return { message: "Course updated successfully" };
  }

  /**
   * Delete course
   */
  public async deleteCourse(courseId: string, userId: string) {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // Check if user is the instructor of this course
    if (course.instructor.toString() !== userId.toString()) {
      throw new BadRequestException("You can only delete your own courses");
    }

    const imageUrl = course.imageUrl?.split("/").pop();

    if (imageUrl) {
      await deleteFile("demo-bucket", imageUrl);
    }

    await CourseModel.findByIdAndDelete(courseId);
    return { deleted: true };
  }

  /**
   * Get instructor's courses
   */
  public async getInstructorCourses(
    instructorId: string,
    pagination: { page: number; limit: number }
  ) {
    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      throw new BadRequestException("Invalid instructor ID");
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const courses = await CourseModel.find({ instructor: instructorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CourseModel.countDocuments({
      instructor: instructorId,
    });

    return {
      courses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCourses: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Toggle course publish status
   */
  public async toggleCoursePublish(courseId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException("Invalid course ID");
    }

    const course = await CourseModel.findById(courseId);

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // Check if user is the instructor of this course
    if (course.instructor.toString() !== userId.toString()) {
      throw new BadRequestException("You can only manage your own courses");
    }

    const lessonCount = await LessonModel.countDocuments({
      courseId: course._id,
    });
    if (lessonCount === 0) {
      throw new BadRequestException("Cannot publish a course with no lessons");
    }

    // Toggle published status
    course.published = !course.published;
    await course.save();

    return {
      message: `Course ${course.published ? "published" : "unpublished"
        } successfully`,
    };
  }

  /**
   * Enroll user in a course
   */
  public async enrollUserInCourse(courseId: string, userId: string) {
    const course = await CourseModel.findById(courseId).select(
      "price published"
    );
    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // ✅ Check if course is published
    if (!course.published) {
      throw new BadRequestException("Course is not published");
    }

    // ✅ Ensure course is free (no price or 0)
    if (typeof course.price === "number" && course.price > 0) {
      throw new BadRequestException("This course requires payment");
    }

    // Prevent duplicate enrollment
    const existingEnrollment = await EnrollmentModel.findOne({
      user: userId,
      course: courseId,
    });
    if (existingEnrollment) {
      return {
        message: "Already enrolled",
        enrolled: true,
      };
    }

    // Create enrollment
    await EnrollmentModel.create({
      user: userId,
      course: courseId,
    });

    return {
      message: "Enrolled successfully",
      enrolled: false,
    };
  }

  /**
   * Get user's enrolled courses
   */
  public async getUserEnrolledCourses(userId: string) {
    const enrollments = await EnrollmentModel.find({ user: userId }).populate('course');
    return enrollments;
  }
}
