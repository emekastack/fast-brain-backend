import { ErrorCode } from "../../common/enums/error-code.enum";
import { NotFoundException } from "../../common/utils/catch-errors";
import { HTTPSTATUS } from "../../config/http.config";
import PaymentModel from "../../database/models/payment.model";
import QuizModel from "../../database/models/quiz.model";
import SessionModel from "../../database/models/session.model";
import { getQiz } from "../../utils/get-quiz-questions";

export class UserService {
  public async getSessionById(sessionId: string) {
    const session = await SessionModel.findById(sessionId)

    if (!session) {
      throw new NotFoundException("Session not found");
    }
    const { userId, role, name, email } = session;
    return {
      userId,
      role,
      name,
      email
    };
  }

  public async getQuiz(userId: string, subject: string): Promise<any> {
  // Check if user has purchased at least one course (completed payment)
  const hasPaid = await PaymentModel.exists({ user: userId, status: "completed" });

  // Find or create the user's quiz record
  let quiz = await QuizModel.findOne({ user: userId });
  if (!quiz) {
    quiz = await QuizModel.create({ user: userId, count: 0 });
  }

  // If user has paid, allow unlimited increments
  if (hasPaid) {
    await quiz.increaseCount();
    return await getQiz(subject)    
  }

  // If not paid, allow only up to 5 quizzes
  if (quiz.count < 5) {
    await quiz.increaseCount();
    return await getQiz(subject)
  } 

  throw new NotFoundException("Exceeded max quiz. Buy a Course", ErrorCode.ACCESS_FORBIDDEN);
}
}