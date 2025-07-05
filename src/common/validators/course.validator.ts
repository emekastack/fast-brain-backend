// src/common/validators/course.validator.ts
import { z } from "zod";

export const createCourseSchema = z.object({
    title: z.string()
        .min(5, "Course title must be at least 5 characters")
        .max(100, "Course title must not exceed 100 characters")
        .trim(),
    description: z.string()
        .min(20, "Course description must be at least 20 characters")
        .max(2000, "Course description must not exceed 2000 characters"),
    instructor: z.string().min(1, "Instructor is required"),
    categoryId: z.string().min(1, "Category is required"),
    imageUrl: z.string().url("Invalid image URL").optional(),      
    price: z.number()
        .positive("Price must be positive")
        .optional(),
});

export const updateCourseSchema = z.object({
    title: z.string()
        .min(5, "Course title must be at least 5 characters")
        .max(100, "Course title must not exceed 100 characters")
        .trim()
        .optional(),
    description: z.string()
        .min(20, "Course description must be at least 20 characters")
        .max(2000, "Course description must not exceed 2000 characters")
        .optional(),
    categoryId: z.string().min(1, "Category is required").optional(),
    imageUrl: z.custom<Express.Multer.File>((val) => {
        if (!val) return true; // Allow optional
        return val instanceof Object && 'buffer' in val && 'originalname' in val;
    }, "Invalid file format").optional(),    
    price: z.number()
        .positive("Price must be positive")
        .max(10000, "Price must not exceed $10,000")
        .optional(),
});