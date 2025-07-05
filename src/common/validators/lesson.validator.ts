import { z } from "zod";

export const createLessonSchema = z.object({
    title: z.string()
        .min(1, "Lesson title is required")
        .max(200, "Lesson title must not exceed 200 characters")
        .trim(),
    content: z.string()
        .min(1, "Lesson content is required")
        .max(10000, "Lesson content must not exceed 10,000 characters"),
    videoUrl: z.string().url("Invalid video URL").optional(),
    duration: z.number()
        .positive("Duration must be positive")
        .max(480, "Duration must not exceed 8 hours (480 minutes)")
        .optional(),
    course: z.string().min(1, "Course is required"),
    order: z.number()
        .int("Order must be an integer")
        .min(0, "Order must be non-negative")
        .optional(),
    attachments: z.array(z.string()).optional(),
});

export const updateLessonSchema = z.object({
    title: z.string()
        .min(1, "Lesson title is required")
        .max(200, "Lesson title must not exceed 200 characters")
        .trim()
        .optional(),
    content: z.string()
        .min(1, "Lesson content is required")
        .max(10000, "Lesson content must not exceed 10,000 characters")
        .optional(),
    videoUrl: z.string().url("Invalid video URL").optional(),
    duration: z.number()
        .positive("Duration must be positive")
        .max(480, "Duration must not exceed 8 hours (480 minutes)")
        .optional(),
    order: z.number()
        .int("Order must be an integer")
        .min(0, "Order must be non-negative")
        .optional(),
    attachments: z.array(z.string()).optional(),
}); 