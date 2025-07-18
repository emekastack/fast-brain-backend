// src/common/interface/course.interface.ts
export interface CreateCourseDto {
    title: string;
    description: string;
    instructor: string;
    categoryId: string;
    imageUrl?: Express.Multer.File;
    // videoUrl?: string;
    attachments?: string[];
    price?: number;
}

export interface UpdateCourseDto {
    title?: string;
    description?: string;
    categoryId?: string;
    category?: {
        _id: any;
        name: string;
    };
    imageUrl?: Express.Multer.File;    
    price?: number;
}

export interface CourseFilters {
    page: number;
    limit: number;
    published?: boolean;
    category?: string;
    instructor?: string;
    search?: string;
} 