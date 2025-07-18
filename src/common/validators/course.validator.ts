// src/common/validators/course.validator.ts
import { z } from "zod";

export const createCourseSchema = z.object({
    title: z.string()
        .min(5, "Course title must be at least 5 characters")
        .max(100, "Course title must not exceed 100 characters")
        .trim(),
    description: z.string()
        .min(5, "Course description must be at least 20 characters")
        .max(2000, "Course description must not exceed 2000 characters"),
    instructor: z.string().min(1, "Instructor is required"),
    categoryId: z.string().min(1, "Category is required"),
    imageUrl: z.custom<Express.Multer.File>((val) => {
        if (!val) return true; // Allow optional
        return val instanceof Object && 'buffer' in val && 'originalname' in val;
    }, "Invalid file format").optional(),      
    price: z.string().transform((val) => val === undefined ? undefined : Number(val)).optional(),
});

export const updateCourseSchema = z.object({
    title: z.string()
        .min(5, "Course title must be at least 5 characters")
        .max(100, "Course title must not exceed 100 characters")
        .trim()
        .optional(),
    description: z.string()
        .min(5, "Course description must be at least 20 characters")
        .max(2000, "Course description must not exceed 2000 characters")
        .optional(),
    categoryId: z.string().min(1, "Category is required").optional(),
    imageUrl: z.custom<Express.Multer.File>((val) => {
        if (!val) return true; // Allow optional
        return val instanceof Object && 'buffer' in val && 'originalname' in val;
    }, "Invalid file format").optional(),    
    price: z.string().transform((val) => val === undefined ? undefined : Number(val)).optional(),
});