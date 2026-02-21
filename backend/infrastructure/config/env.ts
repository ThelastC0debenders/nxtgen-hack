import dotenv from "dotenv";
dotenv.config();

export const env = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production",
    DATABASE_URL: process.env.DATABASE_URL || "",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
};
