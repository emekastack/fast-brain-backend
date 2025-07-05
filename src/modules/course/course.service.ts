import { BadRequestException, NotFoundException } from "../../common/utils/catch-errors";
import { ErrorCode } from "../../common/enums/error-code.enum";
import CourseModel from "../../database/models/course.model";
import CategoryModel from "../../database/models/category.model";
import UserModel from "../../database/models/user.model";
import { CourseFilters, CreateCourseDto, UpdateCourseDto } from "../../common/interface/course.interface";
import mongoose from "mongoose";
import { uploadImage } from "../../config/multer.config";
import { uploadAndGetUrl } from "../../config/storj.config";

export class CourseService {
    /**
     * Create a new course
     */
    public async createCourse(courseData: CreateCourseDto) {
        const { title, categoryId, instructor } = courseData;

        // Verify instructor exists
        const instructorExists = await UserModel.findById(instructor);
        if (!instructorExists) {
            throw new NotFoundException("Instructor not found");
        }

        // Verify category exists
        const category = await CategoryModel.findById(categoryId);
        if (!category) {
            throw new NotFoundException("Category not found");
        }

        // Check if course with same title already exists for this instructor
        const existingCourse = await CourseModel.findOne({
            title: { $regex: new RegExp(`^${title}$`, 'i') },
            instructor
        });

        if (existingCourse) {
            throw new BadRequestException(
                "You already have a course with this title",
                ErrorCode.VALIDATION_ERROR
            );
        }

        // Create course with category info embedded
        const course = await CourseModel.create({
            ...courseData,
            category: {
                _id: category._id,
                name: category.name
            }
        });
        
        return course;
    }

    /**
     * Get all courses with filters and pagination
     */
    public async getCourses(filters: CourseFilters) {
        const { page, limit, category, instructor, search } = filters;

        // Build query
        const query: any = {   
            //TODO: remove this after testing
            // published: true
        };

        if (category) {
            query['category._id'] = category;
        }       

        if (instructor) {
            query.instructor = instructor;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get courses with pagination
        const courses = await CourseModel.find(query)
            .populate('instructor')
            .select('title instructor category published imageUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await CourseModel.countDocuments(query);

        return {
            courses,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCourses: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    }

    /**
     * Get course by ID
     */
    public async getCourseById(courseId: string) {
        const course = await CourseModel.findById(courseId)
            .populate('instructor');

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        return course;
    }

    /**
     * Update course
     */
    public async updateCourse(courseId: string, updateData: UpdateCourseDto, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            throw new BadRequestException("Invalid course ID");
        }
        const course = await CourseModel.findById(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        // Check if user is the instructor of this course
        if (course.instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only update your own courses");
        }

        const dataToUpdate: any = {};
        // If category is being updated, verify it exists and update embedded category
        if (updateData.categoryId) {
            const category = await CategoryModel.findById(updateData.categoryId);
            if (!category) {
                throw new NotFoundException("Category not found");
            }

            dataToUpdate.category = {
                _id: category._id,
                name: category.name
            };
        }

         // If title is being updated, check for duplicates
         if (updateData.title && updateData.title !== course.title) {
            const existingCourse = await CourseModel.findOne({
                title: { $regex: new RegExp(`^${updateData.title}$`, 'i') },
                instructor: userId,
                _id: { $ne: courseId }
            });

            if (existingCourse) {
                throw new BadRequestException(
                    "You already have a course with this title",
                    ErrorCode.VALIDATION_ERROR
                );
            }
        }

        if (updateData.imageUrl) {           
            const existingFilename = course.imageUrl.split('/').pop();
            const imageUrl = await uploadAndGetUrl(updateData.imageUrl.buffer, updateData.imageUrl.originalname, 'demo-bucket', existingFilename);            
            if (imageUrl) {
                dataToUpdate.imageUrl = imageUrl;
            }
        }       
        
        dataToUpdate.title = updateData.title;
        dataToUpdate.description = updateData.description;

        const updatedCourse = await CourseModel.findByIdAndUpdate(
            courseId,
            {$set: dataToUpdate},
            { new: true, runValidators: true }
        );

        return updatedCourse;
    }

    /**
     * Delete course
     */
    public async deleteCourse(courseId: string, userId: string) {
        const course = await CourseModel.findById(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        // Check if user is the instructor of this course
        if (course.instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only delete your own courses");
        }

        await CourseModel.findByIdAndDelete(courseId);
        return { deleted: true };
    }

    /**
     * Get instructor's courses
     */
    public async getInstructorCourses(instructorId: string, pagination: { page: number; limit: number }) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;

        const courses = await CourseModel.find({ instructor: instructorId })
            .populate('instructor', 'name email')
            .populate('lessons')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await CourseModel.countDocuments({ instructor: instructorId });

        return {
            courses,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCourses: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    }

    /**
     * Toggle course publish status
     */
    public async toggleCoursePublish(courseId: string, userId: string) {
        const course = await CourseModel.findById(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        // Check if user is the instructor of this course
        if (course.instructor.toString() !== userId.toString()) {
            throw new BadRequestException("You can only manage your own courses");
        }

        // Toggle published status
        course.published = !course.published;
        await course.save();

        await course.populate('instructor', 'name email');
        await course.populate('lessons');
        return course;
    }
}