import mongoose, { Document, Schema } from "mongoose";

export interface LessonDocument extends Document {
    title: string;
    content: string;
    videoUrl?: string;
    duration?: number; // in minutes
    course: mongoose.Types.ObjectId;
    order: number; // to maintain lesson sequence
    attachments?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const lessonSchema = new Schema<LessonDocument>(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        videoUrl: { type: String },
        duration: { type: Number }, // in minutes
        course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        order: { type: Number, required: true, default: 0 },
        attachments: { type: [String], default: [] }
    },
    { timestamps: true }
);

// Create compound index to ensure unique order within a course
lessonSchema.index({ course: 1, order: 1 }, { unique: true });

// Create index on course for efficient queries
lessonSchema.index({ course: 1 });

const LessonModel = mongoose.model<LessonDocument>("Lesson", lessonSchema);

export default LessonModel; 