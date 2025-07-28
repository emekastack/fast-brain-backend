import { Router } from "express";
import { authenticateJWT } from "../../common/strategies/jwt.strategy";
import { cartController } from "./cart.module";

const cartRoutes = Router();

// All cart routes require authentication
cartRoutes.use(authenticateJWT);

// GET /cart - Get user's cart
cartRoutes.get("/", cartController.getCart);

// POST /cart/add - Add item to cart
cartRoutes.post("/add", cartController.addToCart);

// DELETE /cart/remove/:productId - Remove item from cart
cartRoutes.delete("/remove/:productId", cartController.removeFromCart);

// DELETE /cart/clear - Clear entire cart
cartRoutes.delete("/clear", cartController.clearCart);

// GET /cart/count - Get cart items count
cartRoutes.get("/count", cartController.getCartItemsCount);


export default cartRoutes;