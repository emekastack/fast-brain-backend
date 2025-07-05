// src/common/interface/lesson.interface.ts
export interface CreateLessonDto {
    title: string;
    content: string;
    videoUrl?: string;
    duration?: number;
    course: string;
    order?: number;
    attachments?: string[];
}

export interface UpdateLessonDto {
    title?: string;
    content?: string;
    videoUrl?: string;
    duration?: number;
    order?: number;
    attachments?: string[];
} 