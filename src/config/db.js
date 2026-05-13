import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database is Connected");
  } catch (error) {
    console.log("Database Connection Error", error.message);
    process.exit(1);
  }
};

export default connectDB;
