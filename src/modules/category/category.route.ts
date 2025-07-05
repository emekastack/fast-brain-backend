import { Router } from "express";
import { categoryController } from "./category.module";
import { authenticateJWT } from "../../common/strategies/jwt.strategy";
import { adminRoute } from "../../middlewares/adminRoute";

const categoryRoutes = Router();

// Public routes
categoryRoutes.get("/", categoryController.getCategories);
categoryRoutes.get("/:id", categoryController.getCategoryById);

// Private routes (Admin only)
categoryRoutes.post("/", authenticateJWT, adminRoute, categoryController.createCategory);
categoryRoutes.put("/:id", authenticateJWT, adminRoute, categoryController.updateCategory);
categoryRoutes.delete("/:id", authenticateJWT, adminRoute, categoryController.deleteCategory);

export default categoryRoutes;
