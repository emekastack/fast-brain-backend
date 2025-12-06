import mongoose, { Document, Schema } from "mongoose";

export interface ReviewDocument extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ course: 1, user: 1 }, { unique: true });

const ReviewModel = mongoose.model<ReviewDocument>("Review", reviewSchema);

export default ReviewModel;
