import mongoose from "mongoose";
import {
  BadRequestException,
  NotFoundException,
} from "../../common/utils/catch-errors";
import CartModel from "../../database/models/cart.model";
import CourseModel from "../../database/models/course.model";
import EnrollmentModel from "../../database/models/enrollment.model";

export class CartService {
  // GET USER CART
  public async getCart(userId: string) {
    const cart = await CartModel.findOne({ user: userId }).populate({
      path: "items.course",
      select: "title category imageUrl price -_id",
      populate: [
        {
          path: "category",
          select: "name",
        },
      ],
    });

    if (!cart) {
      throw new NotFoundException("Cart not found");
    }

    return { cart };
  }

  // ADD ITEM TO CART
  public async addToCart(userId: string, cartData: { courseId: string }) {
    const { courseId } = cartData;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    // 1. Validate course
    const course = await CourseModel.findById(courseId).select("price published").lean();
    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // ✅ Check if course is published
    if (!course.published) {
      throw new BadRequestException("Course is not published");
    }

    if (typeof course.price !== "number" || course.price <= 0) {
      throw new BadRequestException("Course price is invalid");
    }

    // 2. Ensure not already enrolled
    const isEnrolled = await EnrollmentModel.exists({
      user: userObjectId,
      course: courseObjectId,
    });
    if (isEnrolled) {
      throw new BadRequestException("You are already enrolled in this course");
    }

    // 3. Load or create cart as a document
    let cart = await CartModel.findOne({ user: userObjectId });
    if (!cart) {
      cart = new CartModel({
        user: userObjectId,
        items: [],
      });
    }

    // 4. Check if course is already in the cart
    const alreadyInCart = cart.items.some((item) =>
      item.course.equals(courseObjectId)
    );
    if (alreadyInCart) {
      throw new BadRequestException("Course already exists in cart");
    }

    // 5. Enforce cart size limit
    if (cart.items.length >= 10) {
      throw new BadRequestException("Cart can only hold up to 10 items");
    }

    // 6. Add item to cart and save (triggering pre-save middleware)
    cart.items.push({ course: courseObjectId, price: course.price } as any);
    await cart.save(); // triggers totalPrice calculation

    return {
      message: "Item added to cart successfully",
      cart,
    };
  }


  // REMOVE ITEM FROM CART
  public async removeFromCart(userId: string, productId: string) {
    // First check if cart exists and contains the item
    const existingCart = await CartModel.findOne({ user: userId });

    if (!existingCart) {
      throw new NotFoundException("Cart not found");
    }

    // Check if the item exists in the cart
    const itemExists = existingCart.items.some((item) => {
      return item._id.toString() === productId;
    });

    if (!itemExists) {
      throw new NotFoundException("Item not found in cart");
    }

    // Remove the item and update totalPrice in one operation
    const updatedCart = await CartModel.findOneAndUpdate(
      { user: userId },
      [
        {
          $set: {
            items: {
              $filter: {
                input: "$items",
                as: "item",
                cond: {
                  $ne: ["$$item._id", new mongoose.Types.ObjectId(productId)],
                },
              },
            },
            totalPrice: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$items",
                      as: "item",
                      cond: {
                        $ne: [
                          "$$item._id",
                          new mongoose.Types.ObjectId(productId),
                        ],
                      },
                    },
                  },
                  as: "filteredItem",
                  in: "$$filteredItem.price",
                },
              },
            },
          },
        },
      ],
      { new: true }
    );

    return {
      message: "Item removed from cart successfully",
      cart: updatedCart,
    };
  }

  // CLEAR ENTIRE CART
  public async clearCart(userId: string) {
    const cart = await CartModel.findOneAndUpdate(
      { user: userId },
      { items: [] },
      { new: true }
    );
    if (!cart) {
      throw new NotFoundException("Cart not found");
    }
    return { message: "Cart cleared successfully", cart };
  }

  // GET CART ITEMS COUNT
  public async getCartItemsCount(userId: string) {
    const cart = await CartModel.findOne({ user: userId }).select("items");
    if (!cart) {
      return { count: 0 };
    }
    return { count: cart.items.length };
  }
}
