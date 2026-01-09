import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3001),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  SUPER_ADMIN_EMAIL: required("SUPER_ADMIN_EMAIL"),
  SUPER_ADMIN_PASSWORD: required("SUPER_ADMIN_PASSWORD"),
  APP_URL: required("APP_URL")
};
