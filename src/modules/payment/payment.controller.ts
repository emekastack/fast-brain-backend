import { asyncHandler } from "../../middlewares/asyncHandler";
import { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../../config/app.config";
import { HTTPSTATUS } from "../../config/http.config";
import { PaymentService } from "./payment.service";

export class PaymentController {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  /**
   * @desc Initialize checkout payment
   * @route GET /api/payment/checkout
   * @access Private
   */
  public initializeCheckout = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = (req as any).user?.userId;     
      const { checkoutUrl } = await this.paymentService.initializeCheckout(
        userId
      );

      return res.status(HTTPSTATUS.OK).json({
        message: "Checkout initialized successfully",
        checkoutUrl,
      });
    }
  );

  /**
   * @desc Handle Paystack webhook events
   * @route POST /webhook/paystack
   * @description This endpoint handles Paystack webhook events for payment status updates.
   * @access Public (but verified)
   */
  public handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const hash = crypto
      .createHmac("sha512", config.PAYSTACK_SECRET_KEY || "")
      .update(JSON.stringify(req.body))
      .digest("hex");

    const signature = req.headers["x-paystack-signature"] as string;

    if (hash !== signature) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: "Invalid signature",
      });
    }

    const event = req.body;

    switch (event.event) {
      case "charge.success":
        await this.handleSuccessfulPayment(event.data);
        break;
      case "charge.failed":
      case "charge.dispute":
        await this.handleFailedPayment(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "Webhook processed successfully",
    });
  });

  // Private methods to handle payment events
  private async handleSuccessfulPayment(data: any) {
    const reference = data.reference;
    try {
      await this.paymentService.verifyPayment(reference);
      console.log(`Payment successful for reference: ${reference}`);
    } catch (error: any) {
      console.error(
        `Error handling successful payment for ${reference}:`,
        error
      );
      throw error;
    }
  }

  // Private method to handle failed payments
  private async handleFailedPayment(data: any) {
    const reference = data.reference;

    try {
      // TODO: Implement logic to handle failed payment
      // await this.orderService.handleFailedPayment(reference, data);
      console.log(`Payment failed for reference: ${reference}`);
    } catch (error: any) {
      console.error(`Error handling failed payment for ${reference}:`, error);
      throw error;
    }
  }
}
