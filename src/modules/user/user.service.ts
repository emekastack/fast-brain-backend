import { ErrorCode } from "../../common/enums/error-code.enum";
import { Roles } from "../../common/enums/role.enum";
import { UserFilters } from "../../common/interface/user.interface";
import { NotFoundException } from "../../common/utils/catch-errors";
import { HTTPSTATUS } from "../../config/http.config";
import CourseModel from "../../database/models/course.model";
import EnrollmentModel from "../../database/models/enrollment.model";
import LessonModel from "../../database/models/lesson.model";
import PaymentModel from "../../database/models/payment.model";
import QuizModel from "../../database/models/quiz.model";
import SessionModel from "../../database/models/session.model";
import UserModel from "../../database/models/user.model";
import { getQiz } from "../../utils/get-quiz-questions";

export class UserService {
  public async getSessionById(sessionId: string) {
    const session = await SessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException("Session not found");
    }
    const { userId, role, name, email } = session;
    return {
      userId,
      role,
      name,
      email,
    };
  }

  public async getQuiz(userId: string, subject: string): Promise<any> {
    // Check if user has purchased at least one course (completed payment)
    const hasPaid = await PaymentModel.exists({
      user: userId,
      status: "completed",
    });

    // Find or create the user's quiz record
    let quiz = await QuizModel.findOne({ user: userId });
    if (!quiz) {
      quiz = await QuizModel.create({ user: userId, count: 0 });
    }

    // If user has paid, allow unlimited increments
    if (hasPaid) {
      await quiz.increaseCount();
      return await getQiz(subject);
    }

    // If not paid, allow only up to 5 quizzes
    if (quiz.count < 10) {
      console.log("Quiz count");
      await quiz.increaseCount();
      return await getQiz(subject);
    }

    throw new NotFoundException(
      "Exceeded max quiz. Buy a Course",
      ErrorCode.ACCESS_FORBIDDEN
    );
  }

  public async getAllUsers(data: UserFilters): Promise<any> {
    const { page, limit, search, role } = data;
    const filters: any = {};
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      filters.role = role;
    }

    const skip = (page - 1) * limit;

    const users = await UserModel.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: "enrollments", // collection name in MongoDB (usually plural, check your DB)
          localField: "_id",
          foreignField: "user",
          as: "enrollments",
        },
      },
      {
        $addFields: {
          totalCoursesEnrolled: { $size: "$enrollments" },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          totalCoursesEnrolled: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }, // Exclude enrollments from the final output
      { $sort: { createdAt: -1 } }, // Sort by creation date, descending
      { $skip: skip },
      { $limit: limit },
    ]);
    const totalUsers = await UserModel.countDocuments(filters);

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalCourses: totalUsers,
        hasNextPage: page < Math.ceil(totalUsers / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  public async getDashboard() {
    const totalUsers = await UserModel.countDocuments();
    const totalCourses = await CourseModel.countDocuments();
    const totalLessons = await LessonModel.countDocuments();
    const totalPayments = await PaymentModel.countDocuments({
      status: "completed",
    });
    const totalQuizzes = await QuizModel.countDocuments();
    const totalSessions = await SessionModel.countDocuments();

    const recentSessions = await SessionModel.find({ })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt");

    const courseEngagement = await EnrollmentModel.aggregate([
      {
        $group: {
          _id: "$course",
          enrollments: { $sum: 1 },
        },
      },
      {
        $sort: { enrollments: -1 },
      },
      { $limit: 5 },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
      $project: {
        _id: 0,
        courseId: "$course._id",
        title: "$course.title",
        enrollments: 1
      }
    }
    ]);

    return {
      totalUsers,
      totalCourses,
      totalQuizzes,
      totalSessions,
      totalLessons,
      totalPayments,
      recentSessions,
      courseEngagement,
    };
  }
}
