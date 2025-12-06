import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { filterXSS } from "xss";
import { config } from "./config/app.config";
import { HTTPSTATUS } from "./config/http.config";
import "./database/database";
import { asyncHandler } from "./middlewares/asyncHandler";
import { errorHandler } from "./middlewares/errorHandler";
import passport from "./middlewares/passport";
import redisClient, { connectRedis } from "./redis.client";
import { initializeRateLimiters, getGlobalRateLimiter } from "./config/rate-limiter.config";

const app = express();
const BASE_PATH = config.BASE_PATH;

const startServer = async () => {
    try {
        await connectRedis();
        console.log("✅ Redis connection established");

        // Initialize rate limiters FIRST
        initializeRateLimiters();

        // CRITICAL: Increase payload limits for video uploads
        app.use(express.json({ limit: '500mb' }));
        app.use(express.urlencoded({ extended: true, limit: '500mb' }));

        app.use(cors({
            origin: config.APP_ORIGIN,
            credentials: true
        }));

        app.use(helmet());
        app.use(cookieParser());

        // Apply global rate limiter
        app.use(getGlobalRateLimiter());

        app.use(morgan('dev'));
        app.use(passport.initialize());

        // XSS filter
        app.use((req, res, next) => {
            if (req.body && Object.keys(req.body).length > 0) {
                req.body = JSON.parse(filterXSS(JSON.stringify(req.body)));
            }
            next();
        });

        app.get("/", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
            res.status(HTTPSTATUS.OK).json({
                message: "Hello Subscribers!"
            });
        }));

        // Import routes AFTER rate limiters are initialized
        const appRouter = await import("./routes");
        app.use(BASE_PATH, appRouter.default);

        app.use(errorHandler);

        const PORT = config.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`Server running at port ${PORT}`);
        });

        // CRITICAL: Set server timeouts for large file uploads
        server.setTimeout(600000);
        server.keepAliveTimeout = 600000;
        server.headersTimeout = 610000;

        // Handle server errors
        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EPIPE') {
                console.error('EPIPE error occurred - connection was closed');
            } else {
                console.error('Server error:', error);
            }
        });

        // Graceful shutdown app
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                redisClient.quit();
            });
        });

    } catch (err) {
        console.error("❌ Application failed to start:", err);
        process.exit(1);
    }
};

startServer();

export default app;