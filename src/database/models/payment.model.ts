import mongoose, { Document, Schema } from "mongoose";

export interface PaymentDocument extends Document {
    user: mongoose.Types.ObjectId;
    course: mongoose.Types.ObjectId;
    amount: number;
    status: "pending" | "completed" | "failed";
    paymentMethod: string;
    reference: string;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        amount: { type: Number, required: true },
        status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
        paymentMethod: { type: String, required: true },
        reference: { type: String }
    },
    { timestamps: true }
);

const PaymentModel = mongoose.model<PaymentDocument>("Payment", paymentSchema);

export default PaymentModel;