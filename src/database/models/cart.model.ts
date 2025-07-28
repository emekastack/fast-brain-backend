import mongoose, { Document, Schema } from "mongoose";

export interface CartItemDocument extends Document {
  course: mongoose.Types.ObjectId;
  price: number;
}

export interface CartDocument extends Document {
  user: mongoose.Types.ObjectId;
  items: CartItemDocument[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItemDocument>({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  price: { type: Number, required: true },
});

const cartSchema = new Schema<CartDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [cartItemSchema],
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cartSchema.index({ user: 1 }, { unique: true });

cartSchema.pre<CartDocument>("save", function (next) {
  this.totalPrice = this.items.reduce((sum, item) => sum + item.price, 0);
  next();
});

const CartModel = mongoose.model<CartDocument>("Cart", cartSchema);

export default CartModel;
