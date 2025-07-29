import axios from "axios";
import {
  BadRequestException,
  NotFoundException,
} from "../../common/utils/catch-errors";
import {
  PaystackInitializeResponse,
  PaystackVerifyResponse,
} from "../../common/validators/paystack.validator";
import { config } from "../../config/app.config";
import crypto from "crypto";
import CartModel from "../../database/models/cart.model";
import UserModel from "../../database/models/user.model";
import EnrollmentModel from "../../database/models/enrollment.model";
import PaymentModel from "../../database/models/payment.model";
import mongoose from "mongoose";

export class PaymentService {
  private readonly baseURL = "https://api.paystack.co";
  private readonly secretKey: string;

  constructor() {
    this.secretKey = config.PAYSTACK_SECRET_KEY || "";
    if (!this.secretKey) {
      throw new BadRequestException("Paystack secret key is required");
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  // Intialize Checkout
  public async initializeCheckout(userId: string) {
    // Get user cart
    const cart = await CartModel.findOne({ user: userId }).populate({
      path: "items.course",
      select: "title",
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    // Get user details
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already enrolled in any of the courses
    const courseIds = cart.items.map((item) => item.course._id);
    const existingEnrollments = await EnrollmentModel.find({
      user: userId,
      course: { $in: courseIds },
    });

    if (existingEnrollments.length > 0) {
      const enrolledCourseIds = existingEnrollments.map((e) =>
        e.course.toString()
      );
      const enrolledCourses = cart.items.filter((item) =>
        enrolledCourseIds.includes(item.course._id.toString())
      );

      throw new BadRequestException(
        `You are already enrolled in: ${enrolledCourses
          .map((c) => (c.course as any).title)
          .join(", ")}`
      );
    }

    // Create payment record
    const payment = await PaymentModel.create({
      user: userId,
      courses: courseIds,
      amount: cart.totalPrice,
      status: "pending",
      paymentMethod: "paystack",
      reference: this.generateReference(),
    });

    // Initialize Paystack transaction
    const paymentData = await this.initializeTransaction(
      user.email,
      cart.totalPrice,
      payment.reference,
      { userId, courseIds }
    );

    return {
      checkoutUrl: paymentData.data.authorization_url,
    };
  }

  // Verify Payment
  public async verifyPayment(reference: string) {
    const payment = await PaymentModel.findOne({ reference }).populate("user");

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status === "completed") {
      throw new BadRequestException("Payment already processed");
    }

    const verificationResult = await this.verifyTransaction(reference);

    if (verificationResult.success) {
      //start transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Update payment status
        payment.status = "completed";
        await payment.save({ session });

        // Create enrollments for each course
        const enrollments = payment.course.map((courseId) => ({
          user: payment.user,
          course: courseId,
        }));

        await EnrollmentModel.insertMany(enrollments, { session });

        // Clear user's cart
        await CartModel.findOneAndUpdate(
          { user: payment.user },
          { items: [], totalPrice: 0 },
          { session }
        );

        // Commit transaction
        await session.commitTransaction();

        return {
          message: "Payment verified successfully",
        };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      // Payment failed
      payment.status = "failed";
      await payment.save();

      throw new BadRequestException("Payment verification failed");
    }
  }

  // Verify Transaction
  private async verifyTransaction(
    reference: string
  ): Promise<{ success: boolean; data?: any }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: this.getHeaders(),
        }
      );
      const data: PaystackVerifyResponse = response.data;
      return {
        success: data.status && data.data.status === "success",
        data: data.data,
      };
    } catch (error: any) {
      return { success: false };
    }
  }

  // Initialize transaction
  private async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata?: any
  ): Promise<PaystackInitializeResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Convert to kobo (Paystack expects amount in kobo)
          reference,
          metadata,
          callback_url: `${config.APP_ORIGIN}/payment/callback`,
        },
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || "Failed to initialize payment"
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException("Failed to initialize payment");
    }
  }

  // List Transactions
  public async listTransactions(page = 1, perPage = 50) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction?page=${page}&perPage=${perPage}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new BadRequestException(error.response.data.message);
      }
      throw new BadRequestException("Failed to fetch transactions");
    }
  }

  // Generate Reference
  private generateReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `ref_${timestamp}_${random}`;
  }
}
