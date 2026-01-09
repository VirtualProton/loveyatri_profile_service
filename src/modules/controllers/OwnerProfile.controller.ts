import type { FastifyReply, FastifyRequest } from "fastify";
import { OwnerProfileRequest} from "../../types.js";
import { OwnerProfileService } from "../services/OwnerProfileService.js";

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