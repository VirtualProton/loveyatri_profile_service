import type { FastifyReply, FastifyRequest } from "fastify";
import { OwnerProfileRequest, OwnerProfileUpdateRequest } from "../../types.js";
import { getOwnerProfileService, OwnerProfileService, UpdateOwnerProfileService, verifyEmailChangeTokenService } from "../services/OwnerProfileService.js";
import { AppError } from "../../utils/appError.js";

export const OwnerProfileController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { adminId, photoUrl, phone, preferredLanguage, shortBio } = req.body as OwnerProfileRequest["body"];
    try {
        // Profile update logic goes here
        const createProfile = await OwnerProfileService({ adminId, photoUrl, phone, preferredLanguage, shortBio: shortBio ?? null });
        return reply.code(200).send({
            success: true,
            message: "Owner profile updated successfully",
            profile: createProfile
        });
    } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}


export const UpdateOwnerProfileController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const data = req.body as OwnerProfileUpdateRequest["body"];
    try {
        const { owner, emailChangeLink, phoneOtpSent } =
            await UpdateOwnerProfileService(data);

        if (emailChangeLink) {
            return reply.status(200).send({
                success: true,
                message: "Email change verification link sent to new email address",
                emailVerificationRequired: true,
                emailChangeLink,
                phoneOtpSent: !!phoneOtpSent,
                owner,
            });
        }

        if (phoneOtpSent) {
            return reply.status(200).send({
                success: true,
                message: "OTP sent to new phone number",
                emailVerificationRequired: false,
                emailChangeLink: null,
                phoneOtpSent: true,
                owner,
            });
        }

        return reply.status(200).send({
            success: true,
            message: "Owner profile updated successfully",
            emailVerificationRequired: false,
            emailChangeLink: null,
            phoneOtpSent: false,
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
}

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
