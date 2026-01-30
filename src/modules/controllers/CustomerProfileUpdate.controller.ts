import type { FastifyReply, FastifyRequest } from "fastify";
import { CustomerProfileUpdateRequest } from "../../types.js";
import { CustomerProfileUpdateService, VerifyCustomerEmailChangeService } from "../services/CustomerProfileUpdateService.js";
import { AppError } from "../../utils/appError.js";

export const CustomerProfileUpdateController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const body = req.body as CustomerProfileUpdateRequest["body"];
        const {
            customer,
            emailChangeLink,
            phoneOtpSent,
        } = await CustomerProfileUpdateService(body);

        if (emailChangeLink) {
            return reply.status(200).send({
                success: true,
                message: "Email change verification link sent to new email address",
                emailChangeLink,
                customer,
            });
        }

        if (phoneOtpSent) {
            return reply.status(200).send({
                success: true,
                message: "OTP sent to new phone number",
                customer,
            });
        }

        return reply.status(200).send({
            success: true,
            message: "Customer profile updated successfully",
            customer,
        });
    } catch (err: any) {
        // Default values
        let statusCode = 500;
        let message =
            "An unexpected error occurred while updating the customer profile";

        // Our own AppError (business / validation errors)
        if (err instanceof AppError) {
            statusCode = err.statusCode || 500;
            message = err.message || message;
        }
        // Fastify / schema validation style error (if ever bubbled here)
        else if (err?.validation) {
            statusCode = 400;
            message = "Request validation failed";
            return reply.status(statusCode).send({
                success: false,
                message,
                errors: err.validation,
            });
        }
        // Prisma or other known libs can be handled here if you want
        // else if (err?.code === "P2002") { ... }

        // Log unexpected errors for debugging (server-side)
        console.error("CustomerProfileUpdateController error:", err);

        return reply.status(statusCode).send({
            success: false,
            message,
        });
    }
};


export const VerifyCustomerEmailChangeController = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { token } = req.query as { token?: string };

    if (!token) {
      return reply.status(400).send({
        success: false,
        message: "Email change token is required",
      });
    }

    const { customer, emailChanged } = await VerifyCustomerEmailChangeService(token);

    return reply.status(200).send({
      success: true,
      message: emailChanged
        ? "Email address updated successfully"
        : "Email verification complete",
      customer,
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

    console.error("VerifyCustomerEmailChangeController error:", err);

    return reply.status(statusCode).send({
      success: false,
      message,
    });
  }
};
