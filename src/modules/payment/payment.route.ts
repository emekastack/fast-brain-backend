import { Router } from "express";
import { paymentController } from "./payment.module";
import { authenticateJWT } from "../../common/strategies/jwt.strategy";

const webhookRoutes = Router();

webhookRoutes.post("/paystack", paymentController.handleWebhook);
webhookRoutes.get("/initialize", authenticateJWT, paymentController.initializeCheckout);

export default webhookRoutes;