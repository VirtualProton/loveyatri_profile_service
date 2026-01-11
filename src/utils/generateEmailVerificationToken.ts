import { env } from "../config/env.js";
import jwt from "jsonwebtoken";
import { EmailChangeTokenPayload } from "../types.js";

export function buildEmailChangeLink(token: string) {
    return `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(token)}`;
  }

export function signEmailChangeToken(payload: EmailChangeTokenPayload) {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: "15m",
    });
  }