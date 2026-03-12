import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../redis.client';

let globalRateLimiter: RateLimitRequestHandler | null = null;
let authRateLimiter: RateLimitRequestHandler | null = null;

export const initializeRateLimiters = () => {
    // Global rate limiter
    globalRateLimiter = rateLimit({
        store: new RedisStore({
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500,
        message: { error: "Too many requests, please try again later" },
        legacyHeaders: false,
        standardHeaders: true,
        skip: (req) => req.path === '/', // Skip rate limit for health check
    });

    // Auth rate limiter - more lenient for user convenience
    authRateLimiter = rateLimit({
        store: new RedisStore({
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50,
        message: { error: "Too many authentication attempts, please try again later" },
        legacyHeaders: false,
        standardHeaders: true,
    });

    console.log("✅ Rate limiters initialized");
};

export const getGlobalRateLimiter = (): RateLimitRequestHandler => {
    if (!globalRateLimiter) {
        throw new Error("Rate limiters not initialized. Call initializeRateLimiters() first.");
    }
    return globalRateLimiter;
};

export const getAuthRateLimiter = (): RateLimitRequestHandler => {
    if (!authRateLimiter) {
        throw new Error("Rate limiters not initialized. Call initializeRateLimiters() first.");
    }
    return authRateLimiter;
};