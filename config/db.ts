import mongoose from "mongoose";
import { MONGO_URI } from "./env.js";

export const connectDb = async (): Promise<boolean> => {
  if (!MONGO_URI) {
    // eslint-disable-next-line no-console
    console.warn("DB not connected: missing MONGO_URI/MONGODB_URI.");
    return false;
  }
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10_000,
    });
    // eslint-disable-next-line no-console
    console.log("DB connected.");
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DB connection failed:", err);
    return false;
  }
};
