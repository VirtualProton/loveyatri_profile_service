import type { FastifyReply, FastifyRequest } from "fastify";
import { OwnerProfileRequest, OwnerProfileUpdateRequest } from "../../types.js";
import { getOwnerProfileService, OwnerProfileService, UpdateOwnerProfileService, verifyEmailChangeTokenService } from "../services/OwnerProfileService.js";
import { AppError } from "../../utils/appError.js";

export const OwnerProfileController = async (
    req: OwnerProfileRequest,
    reply: FastifyReply
) => {
    try {
        const { adminId, photoUrl, preferredLanguage, shortBio } = req.body;

        // 🔐 Prefer header for phone verification token
        // e.g. "x-phone-verification-token: <jwt>"
        const headerToken = req.headers["x-phone-verification-token"];

        const phoneVerificationToken =
            (typeof headerToken === "string" ? headerToken : undefined) ||
            // Optional: allow from body too if you want
            (req.body as any).phoneVerificationToken;

        const profile = await OwnerProfileService({
            adminId,
            photoUrl,
            preferredLanguage,
            shortBio: shortBio ?? null,
            phoneVerificationToken,
        });

        return reply.code(200).send({
            success: true,
            message: "Owner profile updated successfully.",
            data: profile,
        });
    } catch (err: any) {
        // Known, intentional errors from our code
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({
                success: false,
                message: err.message,
            });
        }

        // Fastify / validation errors (if schema is attached, you may not reach here)
        if (err?.validation) {
            // This is how Fastify exposes validation issues when not using global handler
            return reply.status(400).send({
                success: false,
                message: "Invalid request payload.",
                // optional: expose details in dev only
                // details: err.validation
            });
        }

        // Log unexpected errors for debugging (without leaking to client)
        req.log?.error(err, "Unexpected error in OwnerProfileController");

        return reply.status(500).send({
            success: false,
            message: "Something went wrong while updating owner profile.",
        });
    }
};


export const UpdateOwnerProfileController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const data = req.body as OwnerProfileUpdateRequest["body"];

    try {
        const { owner, emailChangeLink, phoneChanged } =
            await UpdateOwnerProfileService(data);

        // 🔹 Case 1: Email change requested → verification link sent
        if (emailChangeLink) {
            return reply.status(200).send({
                success: true,
                message:
                    "Email change verification link sent to the new email address",
                emailVerificationRequired: true,
                emailChangeLink,
                phoneChanged: !!phoneChanged,
                owner,
            });
        }

        // 🔹 Case 2: Phone changed via phoneVerificationToken
        if (phoneChanged) {
            return reply.status(200).send({
                success: true,
                message: "Owner phone number updated successfully",
                emailVerificationRequired: false,
                emailChangeLink: null,
                phoneChanged: true,
                owner,
            });
        }

        // 🔹 Case 3: Other profile fields updated (no email/phone change)
        return reply.status(200).send({
            success: true,
            message: "Owner profile updated successfully",
            emailVerificationRequired: false,
            emailChangeLink: null,
            phoneChanged: false,
            owner,
        });
    } catch (err: any) {
        let statusCode = 500;
        let message =
            "An unexpected error occurred while updating the owner profile";

        if (err instanceof AppError) {
            statusCode = err.statusCode || 500;
            message = err.message || message;
        } else if (err?.validation) {
            statusCode = 400;
            message = "Request validation failed";
            return reply.status(statusCode).send({
                success: false,
                message,
                errors: err.validation,
            });
        }

        console.error("UpdateOwnerProfileController error:", err);

        return reply.status(statusCode).send({
            success: false,
            message,
        });
    }
};

export const verifyEmailChangeController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { token } = req.query as { token?: string };

        if (!token) {
            return reply.status(400).send({
                success: false,
                message: "Token is required",
            });
        }

        const { owner, emailChanged } = await verifyEmailChangeTokenService(token);

        return reply.status(200).send({
            success: true,
            message: emailChanged
                ? "Email change verified successfully"
                : "Email verification completed",
            emailVerificationRequired: false,
            emailChangeLink: null,
            phoneOtpSent: false,
            owner,
        });
    } catch (err: any) {
        let statusCode = 500;
        let message =
            "An unexpected error occurred while verifying the email change link";

        if (err instanceof AppError) {
            statusCode = err.statusCode || 500;
            message = err.message || message;
        } else if (err?.validation) {
            statusCode = 400;
            message = "Request validation failed";
            return reply.status(statusCode).send({
                success: false,
                message,
                errors: err.validation,
            });
        }

        console.error("verifyEmailChangeController error:", err);

        return reply.status(statusCode).send({
            success: false,
            message,
        });
    }
};



export const getOwnerProfileController = async (
    req: FastifyRequest,
    reply: FastifyReply) => {
    const { id } = req.query as { id: string };
    try {
        const profile = await getOwnerProfileService(id);
        return reply.code(200).send({
            success: true,
            message: "Owner profile fetched successfully",
            data: profile
        });
    } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}
