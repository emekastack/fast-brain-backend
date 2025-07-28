import mongoose, { Document, Schema } from "mongoose";
import { deleteFile } from "../../config/storj.config";

export interface CourseDocument extends Document {
    title: string;
    description: string;
    instructor: mongoose.Types.ObjectId;
    category: {
        _id: mongoose.Types.ObjectId;
        name: string;
    };
    imageUrl: string;
    published: boolean;
    price?: number;    
    createdAt: Date;
    updatedAt: Date;
}

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
    },
    { timestamps: true }
);

// Virtual populate for lessons
courseSchema.virtual('lessons', {
    ref: 'Lesson',
    localField: '_id',
    foreignField: 'course',
    options: { sort: { order: 1 } }
});

// Ensure virtuals are included when converting to JSON
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

// Pre-delete middleware to cascade delete lessons
courseSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const LessonModel = mongoose.model('Lesson');
    const lessons = await LessonModel.find({ courseId: this._id });
    for (const lesson of lessons) {
        if (lesson.videoUrl) {
            try {                
                const url = lesson.videoUrl;
                const match = url?.split('/').pop();
                if (match) {                    
                    await deleteFile('demo-bucket', match);
                }
            } catch (err) {
                // Log error but do not block lesson deletion
                console.error('Failed to delete video file:', err);
            }
        }
    }
    await LessonModel.deleteMany({ courseId: this._id });
    next();
});

courseSchema.pre('findOneAndDelete', { document: false, query: true }, async function(this: any, next: any) {
    const courseId = this.getQuery()._id;
    const LessonModel = mongoose.model('Lesson');
    const lessons = await LessonModel.find({ courseId: courseId });
    for (const lesson of lessons) {
        if (lesson.videoUrl) {
            try {                
                const url = lesson.videoUrl;
                const match = url?.split('/').pop();
                if (match) {                    
                    await deleteFile('demo-bucket', match);
                }
            } catch (err) {
                // Log error but do not block lesson deletion
                console.error('Failed to delete video file:', err);
            }
        }
    }
    await LessonModel.deleteMany({ courseId: courseId });
    next();
});

const CourseModel = mongoose.model<CourseDocument>("Course", courseSchema);

export default CourseModel;