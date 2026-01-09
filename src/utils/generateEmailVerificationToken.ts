import jwt from "jsonwebtoken";
import { env } from "../config/env.js";


const EMAIL_VERIFY_JWT_SECRET = env.JWT_SECRET;
const APP_URL = env.APP_URL; 

export function signEmailVerifyToken(payload: { ownerId: string; email: string }) {
  if (!EMAIL_VERIFY_JWT_SECRET) throw new Error("Missing EMAIL_VERIFY_JWT_SECRET");
  return jwt.sign(payload, EMAIL_VERIFY_JWT_SECRET, { expiresIn: "30m" });
}

export function buildVerifyLink(token: string) {
  if (!APP_URL) throw new Error("Missing APP_URL");
  // You can point this to FE route or API route, your choice.
  return `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
}