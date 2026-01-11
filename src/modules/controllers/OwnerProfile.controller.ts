import type { FastifyReply, FastifyRequest } from "fastify";
import { OwnerProfileRequest, OwnerProfileUpdateRequest } from "../../types.js";
import { OwnerProfileService, UpdateOwnerProfileService, verifyEmailChangeTokenService } from "../services/OwnerProfileService.js";
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
        const emailChangeLink = await UpdateOwnerProfileService(data);
        if (emailChangeLink) {
            return reply.code(200).send({
                success: true,
                message: "Email change verification link sent to new email address",
                emailChangeLink
            });
        } else {
            return reply.code(200).send({
                success: true,
                message: "Owner profile updated successfully",
                emailChangeLink
            });
        }

    } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}

export const verifyEmailChangeController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { token } = req.query as { token: string };
    try{
        await verifyEmailChangeTokenService(token);
        return reply.code(200).send({
            success: true,
            message: "Email change verified successfully",
        });
    }catch(err: any){
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}


