import { Router, Request, Response } from "express";
import { authenticateJWT } from "../common/strategies/jwt.strategy";
import authRouter from "../modules/auth/auth.route";
import userRoute from "../modules/user/user.route";
import { uploadImage, uploadVideo } from "../config/multer.config";
import { uploadAndGetUrl } from "../config/storj.config";
import courseRoutes from "../modules/course/course.route";
import categoryRoutes from "../modules/category/category.route";
import lessonRoutes from "../modules/lesson/lesson.route";

const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/user", authenticateJWT, userRoute);
appRouter.use("/courses", courseRoutes);
appRouter.use("/categories", categoryRoutes);
appRouter.use("/lessons", lessonRoutes);
appRouter.post(
  "/upload",
  uploadImage.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const { buffer, originalname } = req.file;
      const bucket = "demo-bucket";
      const url = await uploadAndGetUrl(buffer, originalname, bucket);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
appRouter.post(
  "/upload-image",
  uploadVideo.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const { buffer, originalname } = req.file;
      const bucket = "demo-bucket";
      const url = await uploadAndGetUrl(buffer, originalname, bucket);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default appRouter;
