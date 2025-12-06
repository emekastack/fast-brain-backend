// src/config/env.ts
// Load dotenv only in development environment
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

/**
 * Helper function to get environment variables with validation
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set (optional)
 * @returns Environment variable value
 * @throws Error if variable is not set and no default provided
 */
export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }

  return value;
};