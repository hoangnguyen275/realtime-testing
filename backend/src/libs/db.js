import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // @ts-ignore
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
    console.log("Database connected successfully!");
  } catch (error) {
    console.log("Database connection error:", error);
    process.exit(1);
  }
};
