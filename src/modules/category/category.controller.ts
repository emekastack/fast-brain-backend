import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { HTTPSTATUS } from "../../config/http.config";
import { CategoryService } from "./category.service";
import { NotFoundException } from "../../common/utils/catch-errors";
import { createCategorySchema, updateCategorySchema } from "../../common/validators/category.validator";

export class CategoryController {
    private categoryService: CategoryService;

    constructor(categoryService: CategoryService) {
        this.categoryService = categoryService;
    }

    /**
     * @desc Create a new category
     * @route POST /api/categories
     * @access Private (Admin only)
     */
    public createCategory = asyncHandler(
        async (req: Request, res: Response) => {
            const body = createCategorySchema.parse(req.body);

            const category = await this.categoryService.createCategory(body);

            return res.status(HTTPSTATUS.CREATED).json({
                message: "Category created successfully",
                category,
            });
        }
    );

    /**
     * @desc Get all categories
     * @route GET /api/categories
     * @access Public
     */
    public getCategories = asyncHandler(
        async (req: Request, res: Response) => {
            const categories = await this.categoryService.getCategories();

            return res.status(HTTPSTATUS.OK).json({
                message: "Categories retrieved successfully",
                categories,
            });
        }
    );

    /**
     * @desc Get category by ID
     * @route GET /api/categories/:id
     * @access Public
     */
    public getCategoryById = asyncHandler(
        async (req: Request, res: Response) => {
            const { id } = req.params;

            const category = await this.categoryService.getCategoryById(id);

            if (!category) {
                throw new NotFoundException("Category not found");
            }

            return res.status(HTTPSTATUS.OK).json({
                message: "Category retrieved successfully",
                category,
            });
        }
    );

    /**
     * @desc Update category
     * @route PUT /api/categories/:id
     * @access Private (Admin only)
     */
    public updateCategory = asyncHandler(
        async (req: Request, res: Response) => {
            const { id } = req.params;
            const body = updateCategorySchema.parse(req.body);

            const category = await this.categoryService.updateCategory(id, body);

            return res.status(HTTPSTATUS.OK).json({
                message: "Category updated successfully",
                category,
            });
        }
    );

    /**
     * @desc Delete category
     * @route DELETE /api/categories/:id
     * @access Private (Admin only)
     */
    public deleteCategory = asyncHandler(
        async (req: Request, res: Response) => {
            const { id } = req.params;

            await this.categoryService.deleteCategory(id);

            return res.status(HTTPSTATUS.OK).json({
                message: "Category deleted successfully",
            });
        }
    );
}