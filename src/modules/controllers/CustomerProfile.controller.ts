import type { FastifyReply, FastifyRequest } from "fastify";
import { CustomerProfileRequest } from "../../types.js";
import { CustomerProfileService } from "../services/CustomerProfileService.js";

export const CustomerProfileController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { customerId, photoUrl, phone, address } = req.body as CustomerProfileRequest["body"];
    try {
        // Profile update logic goes here
        const createProfile = await CustomerProfileService({ customerId, photoUrl, phone, address: address ?? null });
        return reply.code(200).send({
            success: true,
            message: "Customer profile updated successfully",
            profile: createProfile
        });
    } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}
