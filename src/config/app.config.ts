import { getEnv } from "../utils/get-env";

const appConfig = () => ({
  NODE_ENV: getEnv("NODE_ENV", "development"),
  APP_ORIGIN: getEnv("APP_ORIGIN", "localhost"),
  PORT: getEnv("PORT", "5000"),
  BASE_PATH: getEnv("BASE_PATH", "/api/v1"),
  MONGO_URI: getEnv("MONGO_URI"),
  // JWT configuration setup
  BREVO_HOST_URL: getEnv("BREVO_HOST_URL"),
  BREVO_USER: getEnv("BREVO_USER"),
  BREVO_PASS_KEY: getEnv("BREVO_PASS_KEY"),
  // Quiz configuration
  ALOC_ACCESS_TOKEN: getEnv("ALOC_ACCESS_TOKEN"),
  // JWT configuration
  JWT: {
    SECRET: getEnv("JWT_SECRET"),
    EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
    REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
    REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
  },
  // Paystack configuration
  PAYSTACK_SECRET_KEY: getEnv("PAYSTACK_SECRET_KEY"),
  PAYSTACK_PUBLIC_KEY: getEnv("PAYSTACK_PUBLIC_KEY"),
  REDIS_USERNAME: getEnv("REDIS_USERNAME"),
  REDIS_PASSWORD: getEnv("REDIS_PASSWORD"),
  REDIS_HOST: getEnv("REDIS_HOST"),
  REDIS_PORT: getEnv("REDIS_PORT", "6379"),
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getEnv("RESEND_FROM_EMAIL"),
  CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET"),
});

export const config = appConfig();