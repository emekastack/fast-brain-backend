import { z } from "zod";

export const createLessonSchema = z.object({
    title: z.string()
        .min(1, "Lesson title is required")
        .max(200, "Lesson title must not exceed 200 characters")
        .trim(),
    content: z.string()
        .min(1, "Lesson content is required")
        .max(10000, "Lesson content must not exceed 10,000 characters"),
    video: z.custom<Express.Multer.File>((val) => {
        if (!val) return true; // Allow optional
        return val instanceof Object && 'buffer' in val && 'originalname' in val;
    }, "Invalid file format"),
    duration: z.string()
        .min(1, "Duration is required")
        .max(50, "Duration must not exceed 50 characters")
        .optional(),
    courseId: z.string().min(1, "Course is required"),
    order: z.number()
        .int("Order must be an integer")
        .min(0, "Order must be non-negative")
        .optional(),
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
    video: z.custom<Express.Multer.File>((val) => {
            if (!val) return true; // Allow optional
            return val instanceof Object && 'buffer' in val && 'originalname' in val;
        }, "Invalid file format").optional(),
    duration: z.string()
        .min(1, "Duration is required")
        .max(50, "Duration must not exceed 50 characters")
        .transform((val) => val ? Number(val) : undefined)
        .refine((val) => val === undefined || !isNaN(val), { message: "Duration must be a number" })
        .optional(),
    order: z.number()
        .int("Order must be an integer")
        .min(0, "Order must be non-negative")
        .optional(),    
}); 