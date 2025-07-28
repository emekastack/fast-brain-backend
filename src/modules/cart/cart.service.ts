import mongoose, { Types } from "mongoose";
import { NotFoundException } from "../../common/utils/catch-errors";
import CartModel from "../../database/models/cart.model";
import CourseModel from "../../database/models/course.model";
import LessonModel from "../../database/models/lesson.model";

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

    // Validate course existence
    const course = await CourseModel.findById(courseId).select("title price");
    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // Check existing cart and validate constraints
    const existingCart = await CartModel.findOne({ user: userId });

    if (existingCart) {
      // Check if course already exists
      const courseExists = existingCart.items.some(
        (item) => item.course.toString() === courseId
      );
      if (courseExists) {
        throw new Error("Course already exists in cart");
      }

      // Check if cart is full
      if (existingCart.items.length >= 10) {
        throw new Error("Cart can only hold up to 10 items");
      }

      // Add item to existing cart
      const updatedCart = await CartModel.findOneAndUpdate(
        { user: userId },
        {
          $push: { items: { course: courseId, price: course.price } },
        },
        { new: true }
      );

      return {
        message: "Item added to cart successfully",
        cart: updatedCart,
      };
    } else {
      // Create new cart with the item
      const newCart = await CartModel.create({
        user: userId,
        items: [{ course: courseId, price: course.price }],
      });

      return {
        message: "Item added to cart successfully",
        cart: newCart,
      };
    }
  }

  // UPDATE CART ITEM QUANTITY
  public async removeFromCart(userId: string, productId: string) {
    console.log({productId, userId});
  const cart = await CartModel.findOneAndUpdate(
    { user: userId.toString() },
    { 
      $pull: { 
        items: { 
          course: { 
            $in: [productId, new Types.ObjectId(productId)] 
          } 
        } 
      } 
    },
    { new: true }
  );

  if (!cart) {
    throw new NotFoundException("Cart not found");
  }

  console.log("cart", cart);

  return { message: "Item removed from cart successfully" };
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
