// src/common/interface/lesson.interface.ts
export interface CreateLessonDto {
    title: string;
    content: string;
    video: Express.Multer.File;
    duration?: string;
    courseId: string;
    order?: number;
}

export interface UpdateLessonDto {
    title?: string;
    content?: string;
    video?: Express.Multer.File;
    duration?: number;
    order?: number;
} 