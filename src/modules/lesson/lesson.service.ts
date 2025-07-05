import { BadRequestException, NotFoundException } from "../../common/utils/catch-errors";
import { ErrorCode } from "../../common/enums/error-code.enum";
import LessonModel from "../../database/models/lesson.model";
import CourseModel from "../../database/models/course.model";
import { CreateLessonDto, UpdateLessonDto } from "../../common/interface/lesson.interface";

export class LessonService {
    /**
     * Create a new lesson
     */
    public async createLesson(lessonData: CreateLessonDto, userId: string) {
        const { course: courseId, order } = lessonData;

        // Verify course exists and user is the instructor
        const course = await CourseModel.findById(courseId);
        if (!course) {
            throw new NotFoundException("Course not found");
        }

        if (course.instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only add lessons to your own courses");
        }

        // If order is not provided, set it to the next available order
        let lessonOrder = order;
        if (lessonOrder === undefined) {
            const lastLesson = await LessonModel.findOne({ course: courseId })
                .sort({ order: -1 })
                .limit(1);
            lessonOrder = lastLesson ? lastLesson.order + 1 : 0;
        }

        // Check if order already exists for this course
        if (lessonOrder !== undefined) {
            const existingLesson = await LessonModel.findOne({ 
                course: courseId, 
                order: lessonOrder 
            });
            if (existingLesson) {
                throw new BadRequestException(
                    "A lesson with this order already exists in this course",
                    ErrorCode.VALIDATION_ERROR
                );
            }
        }

        const lesson = await LessonModel.create({
            ...lessonData,
            order: lessonOrder
        });

        await lesson.populate('course', 'title');
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

        const lessons = await LessonModel.find({ course: courseId })
            .sort({ order: 1 })
            .populate('course', 'title');

        return lessons;
    }

    /**
     * Get lesson by ID
     */
    public async getLessonById(lessonId: string) {
        const lesson = await LessonModel.findById(lessonId)
            .populate('course', 'title instructor');

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
            .populate('course', 'instructor');

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        // Check if user is the instructor of the course
        if ((lesson.course as any).instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only update lessons in your own courses");
        }

        // If order is being updated, check for conflicts
        if (updateData.order !== undefined && updateData.order !== lesson.order) {
            const existingLesson = await LessonModel.findOne({ 
                course: lesson.course, 
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

        const updatedLesson = await LessonModel.findByIdAndUpdate(
            lessonId,
            updateData,
            { new: true, runValidators: true }
        ).populate('course', 'title');

        return updatedLesson;
    }

    /**
     * Delete lesson
     */
    public async deleteLesson(lessonId: string, userId: string) {
        const lesson = await LessonModel.findById(lessonId)
            .populate('course', 'instructor');

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        // Check if user is the instructor of the course
        if ((lesson.course as any).instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only delete lessons from your own courses");
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
            course: courseId 
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
        const updatedLessons = await LessonModel.find({ course: courseId })
            .sort({ order: 1 })
            .populate('course', 'title');

        return updatedLessons;
    }
} 