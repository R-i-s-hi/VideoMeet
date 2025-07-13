import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
    {
        useer_id: {
            type: String,
        },
        meetingCode: {
            type: String,
            required: true,
        },
        date: {
            type: String,
            default: Date.now(),
            required: true,
        }
    }
)

const Meeting = mongoose.model("User", meetingSchema);

export default {Meeting};