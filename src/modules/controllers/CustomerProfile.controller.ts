import type { FastifyReply } from "fastify";
import { AppError } from "../../utils/appError.js";
import { CustomerProfileRequest } from "../../types.js";
import { CustomerProfileService } from "../services/CustomerProfileService.js";

export const CustomerProfileController = async (
  req: CustomerProfileRequest,
  reply: FastifyReply
) => {
  try {
    const { photoUrl, email, address, city, state } = req.body;
    const customerId = req.user?.id;

    if (!customerId) {
      throw new AppError(401, "Unauthorized");
    }

    const { profile, emailChangeLink } = await CustomerProfileService({
      customerId,
      photoUrl,
      email,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
    });

    return reply.status(200).send({
      success: true,
      message:
        "Customer profile created successfully. Email verification link sent to the email address.",
      profile,
      emailChangeLink,
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
