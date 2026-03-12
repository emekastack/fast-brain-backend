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
    this.secretKey = config.PAYSTACK.SECRET_KEY || "";
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

    const courseIds = cart.items.map((item) => item.course._id).sort(); // important: sorted for comparison

    // Fetch user, enrollments, and any pending payment concurrently
    const [user, existingEnrollments, existingPayment] = await Promise.all([
      UserModel.findById(userId),
      EnrollmentModel.find({ user: userId, course: { $in: courseIds } }),
      PaymentModel.findOne({ user: userId, status: "pending" }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Prevent enrollment duplicates
    if (existingEnrollments.length > 0) {
      const enrolledCourseIds = new Set(
        existingEnrollments.map((e) => e.course.toString())
      );
      const enrolledCourses = cart.items.filter((item) =>
        enrolledCourseIds.has(item.course._id.toString())
      );

      throw new BadRequestException(
        `You are already enrolled in: ${enrolledCourses
          .map((c) => (c.course as any).title)
          .join(", ")}`
      );
    }

    // Generate a new reference for the payment
    const newReference = this.generateReference();

    if (existingPayment) {
      const existingCourseIds = [...existingPayment.course]
        .map((id) => id.toString())
        .sort();
      const incomingCourseIds = [...courseIds]
        .map((id) => id.toString())
        .sort();

      const isSameSet =
        existingCourseIds.length === incomingCourseIds.length &&
        existingCourseIds.every((id, idx) => id === incomingCourseIds[idx]);

      if (isSameSet) {
        // ✅ Update reference
        existingPayment.reference = newReference;
        existingPayment.amount = cart.totalPrice; // in case cart price changed
        await existingPayment.save();

        // Re-initialize Paystack transaction with same reference
        const paymentData = await this.initializeTransaction(
          user.email,
          cart.totalPrice,
          newReference,
          { userId, courseIds }
        );


        return {
          checkoutUrl: paymentData.data.authorization_url,
          reused: true
        }
      }

      const payment = await PaymentModel.create({
        user: userId,
        course: courseIds,
        amount: cart.totalPrice,
        status: "pending",
        paymentMethod: "paystack",
        reference: newReference,
      });

      const paymentData = await this.initializeTransaction(
        user.email,
        cart.totalPrice,
        newReference,
        { userId, courseIds }
      );

      return {
        checkoutUrl: paymentData.data.authorization_url,
        reused: false,
      };
    }

    // Create new payment when no existing pending payment
    const payment = await PaymentModel.create({
      user: userId,
      course: courseIds,
      amount: cart.totalPrice,
      status: "pending",
      paymentMethod: "paystack",
      reference: newReference,
    });

    const paymentData = await this.initializeTransaction(
      user.email,
      cart.totalPrice,
      newReference,
      { userId, courseIds }
    );

    return {
      checkoutUrl: paymentData.data.authorization_url,
      reused: false,
    };
  }

  // Verify Payment
  public async verifyPayment(reference: string) {
    const payment = await PaymentModel.findOne({ reference });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status === "completed") {
      throw new BadRequestException("Payment already processed");
    }

    const { success } = await this.verifyTransaction(reference);

    if (!success) {
      payment.status = "failed";
      await payment.save(); // no need for session here
      throw new BadRequestException("Payment verification failed");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update payment status
      payment.status = "completed";
      await payment.save({ session });

      // Prepare enrollments
      const enrollments = payment.course.map((courseId) => ({
        user: payment.user._id, // avoid passing full user object
        course: courseId,
      }));

      await EnrollmentModel.insertMany(enrollments, { session });

      // Clear cart
      await CartModel.findOneAndUpdate(
        { user: payment.user._id },
        { items: [], totalPrice: 0 },
        { session }
      );

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
