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
    const customerId = req.user?.id;

    if (!customerId) {
      throw new AppError(401, "Unauthorized");
    }

    const headerToken = req.headers["x-phone-verification-token"];
    const verificationToken =
      Array.isArray(headerToken) ? headerToken[0] : headerToken;

    const { customer, emailChangeLink, phoneChanged } =
      await CustomerProfileUpdateService({
        ...body,
        customerId,
        ...(verificationToken !== undefined ? { verificationToken } : {}),
      });

    // Email change → verification link sent
    if (emailChangeLink) {
      return reply.status(200).send({
        success: true,
        message:
          "Email change verification link sent to the new email address. Other profile details were updated successfully (if provided).",
        emailVerificationRequired: true,
        emailChangeLink,
        phoneChanged,
        customer,
      });
    }

    if (phoneChanged) {
      return reply.status(200).send({
        success: true,
        message: "Customer phone number updated successfully.",
        emailVerificationRequired: false,
        emailChangeLink: null,
        phoneChanged: true,
        customer,
      });
    }

    // Only non-email fields changed (name, photo, address, etc.)
    return reply.status(200).send({
      success: true,
      message: "Customer profile updated successfully.",
      emailVerificationRequired: false,
      emailChangeLink: null,
      phoneChanged: false,
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

    // Log unexpected errors for debugging (server-side)
    req.log?.error?.(
      { err },
      "CustomerProfileUpdateController unexpected error"
    );

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
