import type { FastifyReply, FastifyRequest } from "fastify";
import { CustomerProfileUpdateRequest } from "../../types.js";
import { CustomerProfileUpdateService } from "../services/CustomerProfileUpdateService.js";

export const CustomerProfileUpdateController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { customerId, fullName, photoUrl, phone, address, email } = req.body as CustomerProfileUpdateRequest["body"];
    try {
        const serviceParams: {
            customerId: string;
            fullName?: string;
            photoUrl?: string;
            phone?: string;
            address?: string | null;
            email?: string;
        } = { customerId };

        if (typeof fullName !== "undefined") serviceParams.fullName = fullName;
        if (typeof photoUrl !== "undefined") serviceParams.photoUrl = photoUrl;
        if (typeof phone !== "undefined") serviceParams.phone = phone;
        if (typeof address !== "undefined") serviceParams.address = address;
        if (typeof email !== "undefined") serviceParams.email = email;

        const result = await CustomerProfileUpdateService(serviceParams);

        const response: any = {
            success: true,
            message: "Customer profile updated successfully",
            profile: result.customer,
        };

        // Include email verification info if email was updated
        if (result.emailVerificationToken && result.emailVerificationLink) {
            response.message = "Profile updated successfully. Please verify your new email address.";
            response.emailVerificationRequired = true;
            response.emailVerificationLink = result.emailVerificationLink;
        }

        return reply.code(200).send(response);
    } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}
