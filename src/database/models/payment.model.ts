import mongoose, { Document, Schema } from "mongoose";

export interface PaymentDocument extends Document {
    user: mongoose.Types.ObjectId;
    course: mongoose.Types.ObjectId[];
    amount: number;
    status: "pending" | "completed" | "failed";
    paymentMethod: string;
    reference: string;
    paymentData?: any;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        course: [{ type: Schema.Types.ObjectId, ref: "Course", required: true }],
        amount: { type: Number, required: true },
        status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
        paymentMethod: { type: String, required: true },
        reference: { type: String },
        paymentData: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

// Index for efficient queries
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ reference: 1 });
paymentSchema.index({ createdAt: -1 });

const PaymentModel = mongoose.model<PaymentDocument>("Payment", paymentSchema);

export default PaymentModel;