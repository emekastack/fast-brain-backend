import { BadRequestException, NotFoundException } from "../../common/utils/catch-errors";
import { ErrorCode } from "../../common/enums/error-code.enum";
import LessonModel from "../../database/models/lesson.model";
import CourseModel from "../../database/models/course.model";
import { CreateLessonDto, UpdateLessonDto } from "../../common/interface/lesson.interface";
import mongoose from "mongoose";
import { uploadAndGetUrl, deleteFile } from "../../config/storj.config";

export class LessonService {
    /**
     * Create a new lesson
     */
    public async createLesson(lessonData: CreateLessonDto, userId: string) {
        const { courseId, order } = lessonData;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            throw new BadRequestException("Invalid course ID");
        }

        // Verify course exists and user is the instructor
        const course = await CourseModel.findById(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        if (course.instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only add lessons to your own courses");
        }

        const dataToCreate: any = {};
        dataToCreate.title = lessonData.title;
        dataToCreate.content = lessonData.content;
        dataToCreate.courseId = courseId;
        dataToCreate.videoUrl = null;
        dataToCreate.duration = lessonData.duration;

        // If order is not provided, set it to the next available order
        let lessonOrder = order;
        
        if (lessonOrder === undefined) {
            const lastLesson = await LessonModel.findOne({ courseId: courseId })
                .sort({ order: -1 })
                .limit(1);
            lessonOrder = lastLesson ? lastLesson.order + 1 : 0;
        }

        // Check if order already exists for this course
        if (lessonOrder !== undefined) {
            const existingLesson = await LessonModel.findOne({ 
                courseId: courseId, 
                order: lessonOrder 
            });
            if (existingLesson) {
                throw new BadRequestException(
                    "A lesson with this order already exists in this course",
                    ErrorCode.VALIDATION_ERROR
                );
            }
        }

        if (lessonData.video) {
            const videoUrl = await uploadAndGetUrl(lessonData.video.buffer, lessonData.video.originalname, 'demo-bucket');
            dataToCreate.videoUrl = videoUrl;
        }
      
        const lesson = await LessonModel.create({
            ...dataToCreate,
            order: lessonOrder
        });
        
        return lesson;
    }

    /**
     * Get lessons for a course
     */
    public async getLessonsByCourse(courseId: string) {
        const course = await CourseModel.findById(courseId);
        if (!course) {
            throw new NotFoundException("Course not found");
        }

        const lessons = await LessonModel.find({ courseId: courseId })
            .sort({ order: 1 })            

        return lessons;
    }

    /**
     * Get lesson by ID
     */
    public async getLessonById(lessonId: string) {
        const lesson = await LessonModel.findById(lessonId)
            .populate('courseId', 'title instructor');

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        return lesson;
    }

    /**
     * Update lesson
     */
    public async updateLesson(lessonId: string, updateData: UpdateLessonDto, userId: string) {
        const lesson = await LessonModel.findById(lessonId)
            .populate('courseId', 'instructor');

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        // Check if user is the instructor of the course
        if ((lesson.courseId as any).instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only update lessons in your own courses");
        }

        // If order is being updated, check for conflicts
        if (updateData.order !== undefined && updateData.order !== lesson.order) {
            const existingLesson = await LessonModel.findOne({ 
                courseId: lesson.courseId, 
                order: updateData.order,
                _id: { $ne: lessonId }
            });
            if (existingLesson) {
                throw new BadRequestException(
                    "A lesson with this order already exists in this course",
                    ErrorCode.VALIDATION_ERROR
                );
            }
        }

        if (updateData.video) {
            await uploadAndGetUrl(updateData.video.buffer, updateData.video.originalname, 'demo-bucket', lesson.videoUrl);            
        }

        delete updateData.video;

        const updatedLesson = await LessonModel.findByIdAndUpdate(
            lessonId,
            updateData,
            { new: true, runValidators: true }
        ).populate('courseId', 'title');

        return updatedLesson;
    }

    /**
     * Delete lesson
     */
    public async deleteLesson(lessonId: string, userId: string) {
        const lesson = await LessonModel.findById(lessonId)
            .populate('courseId', 'instructor');

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        // Check if user is the instructor of the course
        if ((lesson.courseId as any).instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only delete lessons from your own courses");
        }
        
        // Delete video file if exists
        if (lesson.videoUrl) {
            try {                
                const url = lesson.videoUrl;
                const match = url?.split('/').pop();
                if (match) {                    
                    await deleteFile('demo-bucket', match);
                }
            } catch (err) {
                // Log error but do not block lesson deletion
                console.error('Failed to delete video file:', err);
            }
        }

        await LessonModel.findByIdAndDelete(lessonId);
        return { deleted: true };
    }

    /**
     * Reorder lessons in a course
     */
    public async reorderLessons(courseId: string, lessonIds: string[], userId: string) {
        const course = await CourseModel.findById(courseId);
        if (!course) {
            throw new NotFoundException("Course not found");
        }

        if (course.instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only reorder lessons in your own courses");
        }

        // Verify all lessons belong to this course
        const lessons = await LessonModel.find({ 
            _id: { $in: lessonIds }, 
            courseId: courseId 
        });

        if (lessons.length !== lessonIds.length) {
            throw new BadRequestException("Some lessons do not belong to this course");
        }

        // Update order for each lesson
        const updatePromises = lessonIds.map((lessonId, index) => 
            LessonModel.findByIdAndUpdate(lessonId, { order: index })
        );

        await Promise.all(updatePromises);

        // Return updated lessons
        const updatedLessons = await LessonModel.find({ courseId: courseId })
            .sort({ order: 1 })            

        return updatedLessons;
    }
} 