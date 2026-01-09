import { prisma } from "./prisma.js";
import jwt from "jsonwebtoken";
import { AppError } from "./appError.js";
import crypto from "crypto";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const addTokenToBlacklist = async (token: string) => {
    try {
        const decoded = jwt.decode(token) as { exp?: number };

        if (!decoded || !decoded.exp) {
            throw new AppError(400, "Invalid token");
        }

        const expiresAt = new Date(decoded.exp * 1000);

        await prisma.tokenBlacklist.create({
            data: {
                tokenHash: hashToken(token),
                expiresAt: expiresAt,
            }
        });

        return true;
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(500, "Failed to blacklist token: " + err.message);
    }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    try {
        const tokenHash = hashToken(token);
        const blacklistedToken = await prisma.tokenBlacklist.findUnique({
            where: { tokenHash }
        });
        return !!blacklistedToken;
    } catch (err: any) {
        return false;
    }
};



// Clean up expired tokens from blacklist (call this periodically via cron job)
export const cleanupExpiredTokens = async () => {
    try {
        const result = await prisma.tokenBlacklist.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        return result.count;
    } catch (err: any) {
        throw new AppError(500, "Failed to cleanup expired tokens: " + err.message);
    }
};
