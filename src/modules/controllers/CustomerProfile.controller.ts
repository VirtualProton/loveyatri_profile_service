import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../utils/appError.js";
import { CustomerProfileRequest } from "../../types.js";
import { CustomerProfileService } from "../services/CustomerProfileService.js";

export const CustomerProfileController = async (
  req: CustomerProfileRequest,
  reply: FastifyReply
) => {
  try {
    const { customerId, photoUrl, address, verificationToken } = req.body;

    const profile = await CustomerProfileService({
      customerId,
      photoUrl,
      address: address ?? null,
      verificationToken,
    });

    return reply.status(200).send({
      success: true,
      message: "Customer profile created successfully.",
      data: profile,
    });
  } catch (err: any) {
    // Known application errors
    if (err instanceof AppError) {
      return reply.status(err.statusCode || 400).send({
        success: false,
        message: err.message,
      });
    }

    // Log unexpected errors for debugging/monitoring
    req.log.error({ err }, "CustomerProfileController unexpected error");

    // Fallback generic error
    return reply.status(500).send({
      success: false,
      message: "Something went wrong while creating customer profile.",
    });
  }
};