import { BadRequestException, NotFoundException } from "../../common/utils/catch-errors";
import { ErrorCode } from "../../common/enums/error-code.enum";
import CategoryModel from "../../database/models/category.model";
import CourseModel from "../../database/models/course.model";
import { CreateCategoryDto, UpdateCategoryDto } from "../../common/interface/category.inerface";

export class CategoryService {
    /**
     * Create a new category
     */
    public async createCategory(categoryData: CreateCategoryDto) {
        const { name } = categoryData;

        // Check if category with same name already exists
        const existingCategory = await CategoryModel.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });

        if (existingCategory) {
            throw new BadRequestException(
                "Category with this name already exists",
                ErrorCode.VALIDATION_ERROR
            );
        }

        const category = await CategoryModel.create(categoryData);
        return category;
    }

    /**
     * Get all categories
     */
    public async getCategories() {
        const categories = await CategoryModel.find({}).sort({ createdAt: -1 })
        .select("-__v -createdAt -updatedAt");
        return categories;
    }

    /**
     * Get category by ID
     */
    public async getCategoryById(categoryId: string) {
        const category = await CategoryModel.findById(categoryId);
        
        if (!category) {
            throw new NotFoundException("Category not found");
        }

        return category;
    }

    /**
     * Update category
     */
    public async updateCategory(categoryId: string, updateData: UpdateCategoryDto) {
        const category = await CategoryModel.findById(categoryId);

        if (!category) {
            throw new NotFoundException("Category not found");
        }

        // If name is being updated, check for duplicates
        if (updateData.name && updateData.name !== category.name) {
            const existingCategory = await CategoryModel.findOne({
                name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
                _id: { $ne: categoryId }
            });

            if (existingCategory) {
                throw new BadRequestException(
                    "Category with this name already exists",
                    ErrorCode.VALIDATION_ERROR
                );
            }
        }

        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            categoryId,
            updateData,
            { new: true, runValidators: true }
        );

        return updatedCategory;
    }

    /**
     * Delete category
     */
    public async deleteCategory(categoryId: string) {
        const category = await CategoryModel.findById(categoryId);

        if (!category) {
            throw new NotFoundException("Category not found");
        }

        // Check if category is being used by any courses
        const coursesUsingCategory = await CourseModel.countDocuments({
            "category._id": categoryId
        });

        if (coursesUsingCategory > 0) {
            throw new BadRequestException(
                "Cannot delete category. It is being used by existing courses.",
                ErrorCode.VALIDATION_ERROR
            );
        }

        await CategoryModel.findByIdAndDelete(categoryId);
        return { deleted: true };
    }
}