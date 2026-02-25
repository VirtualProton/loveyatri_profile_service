import type { FastifyReply, FastifyRequest } from "fastify";
import { OwnerProfileRequest, OwnerProfileUpdateRequest } from "../../types.js";
import { getOwnerProfileService, OwnerProfileService, UpdateOwnerProfileService, verifyEmailChangeTokenService } from "../services/OwnerProfileService.js";
import { AppError } from "../../utils/appError.js";

export const OwnerProfileController = async (
    req: OwnerProfileRequest,
    reply: FastifyReply
) => {
    try {
        const {
            adminId,
            photoUrl,
            preferredLanguage,
            shortBio,

            // optional extras matching AdminProfile schema
            countryCode,
            isGstRegistered,
            gstNumber,
            gstLegalName,
            gstStateCode,
            gstBillingAddress,
            pincode,
            phoneVerificationToken: bodyToken,
        } = req.body;

        // 🔐 Prefer header for phone verification token
        // e.g. "x-phone-verification-token: <jwt>"
        const headerToken = req.headers["x-phone-verification-token"];

        const phoneVerificationToken =
            (typeof headerToken === "string"
                ? headerToken
                : Array.isArray(headerToken)
                    ? headerToken[0]
                    : undefined) || bodyToken;

        // Build payload in a way that’s friendly to exactOptionalPropertyTypes
        const payload: Parameters<typeof OwnerProfileService>[0] = {
            adminId,
            photoUrl,
            preferredLanguage,
            shortBio: shortBio ?? null,
            // optional fields (only added if not undefined)
            ...(countryCode !== undefined ? { countryCode } : {}),
            ...(isGstRegistered !== undefined ? { isGstRegistered } : {}),
            ...(gstNumber !== undefined ? { gstNumber } : {}),
            ...(gstLegalName !== undefined ? { gstLegalName } : {}),
            ...(gstStateCode !== undefined ? { gstStateCode } : {}),
            ...(gstBillingAddress !== undefined ? { gstBillingAddress } : {}),
            ...(pincode !== undefined ? { pincode } : {}),
            ...(phoneVerificationToken !== undefined
                ? { phoneVerificationToken }
                : {}),
        };

        const profile = await OwnerProfileService(payload);

        return reply.code(200).send({
            success: true,
            message: "Owner profile completed successfully.",
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
            return reply.status(400).send({
                success: false,
                message: "Invalid request payload.",
                // details: err.validation, // enable in dev if needed
            });
        }

        return reply.status(500).send({
            success: false,
            message: "Something went wrong while completing owner profile.",
        });
    }
};


export const UpdateOwnerProfileController = async (
  req: OwnerProfileUpdateRequest,
  reply: FastifyReply
) => {
  // req.body is already correctly typed via OwnerProfileUpdateRequest
  const data = req.body;

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

    // If you prefer Fastify logger instead of console:
    // req.log?.error({ err }, "UpdateOwnerProfileController error");

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
