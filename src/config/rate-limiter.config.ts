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
        max: 100,
        message: "Too many requests from this IP, please try again after 15 minutes",
        legacyHeaders: false,
        standardHeaders: true,
    });

    // Auth rate limiter
    authRateLimiter = rateLimit({
        store: new RedisStore({
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        message: "Too many authentication attempts from this IP, please try again after 15 minutes",
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