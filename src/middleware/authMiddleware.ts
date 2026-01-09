import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

export interface JWTPayload {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    isProfileComplete: boolean;
}

declare module "fastify" {
    interface FastifyRequest {
        user?: JWTPayload;
    }
}

export const authenticateToken = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
         console.log("Auth Header:", authHeader);
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError(401, "No token provided");
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Check if token is blacklisted
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            throw new AppError(401, "Token has been revoked");
        }

        // Verify and decode token
        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

        // Attach user data to request
        req.user = decoded;

    } catch (err: any) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({
                success: false,
                message: err.message
            });
        }

        if (err.name === "JsonWebTokenError") {
            return reply.status(401).send({
                success: false,
                message: "Invalid token"
            });
        }

        if (err.name === "TokenExpiredError") {
            return reply.status(401).send({
                success: false,
                message: "Token has expired"
            });
        }

        return reply.status(500).send({
            success: false,
            message: "Authentication failed"
        });
    }
};
