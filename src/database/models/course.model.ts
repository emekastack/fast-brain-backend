import mongoose, { Document, Schema } from "mongoose";

export interface CourseDocument extends Document {
    title: string;
    description: string;
    instructor: mongoose.Types.ObjectId;
    category: {
        _id: mongoose.Types.ObjectId;
        name: string;
    };
    imageUrl?: string;
    published: boolean;
    price?: number;
    lessons: Array<{
        title: string;
        content: string;
        videoUrl?: string;
        duration?: number; // in minutes
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const lessonSchema = new Schema(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        videoUrl: { type: String },
        duration: { type: Number }, // in minutes
    },
    { _id: false }
);

const courseSchema = new Schema<CourseDocument>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
        category: {
            _id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
            name: { type: String, required: true }
        },
        imageUrl: { type: String },
        published: { type: Boolean, default: false },
        price: { type: Number },
        lessons: [lessonSchema],
    },
    { timestamps: true }
);

const CourseModel = mongoose.model<CourseDocument>("Course", courseSchema);

export default CourseModel;