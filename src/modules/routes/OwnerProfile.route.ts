import { FastifyPluginAsync } from "fastify";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { EmailVerificationSchema, getOwnerProfileSchema, OwnerProfileBodySchema, OwnerProfileUpdateSchema, ResponseSchema } from "../schema/OwnerProfile.schema.js";
import { getOwnerProfileController, OwnerProfileController, UpdateOwnerProfileController, verifyEmailChangeController } from "../controllers/OwnerProfile.controller.js";

const ownerProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: "POST",
    url: "/create",

    // 🔐 Auth — only authenticated admins (owners)
    preHandler: [authenticateToken],

    schema: {
      tags: ["Profile Owner"],
      summary: "Create owner profile",
      description:
        "Create a profile for the authenticated owner (admin).\n\n" +
        "### Authorization\n" +
        "- Requires a valid access token.\n" +
        "- Pass JWT as `Authorization: Bearer <token>`.\n\n" +
        "### Phone Verification\n" +
        "- `phoneVerificationToken` is a **separate JWT** issued after successful phone OTP verification.\n" +
        "- The token encodes `isVerified` and the normalized phone number (with country code, e.g. `919876543210`).\n" +
        "- If this token is missing, invalid, expired, or not verified, the request will be rejected.\n\n" +
        "### Behaviour\n" +
        "- Uses the phone number from `phoneVerificationToken`; client must **not** send phone directly.\n" +
        "- Fails if:\n" +
        "  - Owner does not exist (`404`).\n" +
        "  - Owner profile already completed (`409`).\n" +
        "  - Phone number is already linked to another owner profile (`409`).\n" +
        "  - Required fields are missing (`400`).\n" +
        "  - Token is invalid or expired (`400`).\n" +
        "- On success:\n" +
        "  - Creates an `AdminProfile` row.\n" +
        "  - Sets `Admin.isProfileComplete = true`.\n" +
        "  - Sets `Admin.isActive = true`.\n" +
        "  - Returns the created profile including owner basic details.",

      security: [{ bearerAuth: [] }],

      // 🔹 Request body schema (AJV + Swagger)
      body: OwnerProfileBodySchema,

      // 🔹 Response schema (200 / 400 / 404 / 409 / 500)
      response: ResponseSchema.OwnerProfileResponseSchema,
      // or: response: ResponseSchema.OwnerProfileResponseSchema,
    },

    handler: OwnerProfileController,
  });

  fastify.put(
    "/update",
    {
      preHandler: [authenticateToken],

      schema: {
        tags: ["Profile Owner"],
        summary: "Update owner profile",
        description:
          "Update profile details for the authenticated owner (admin).\n\n" +
          "### Authorization\n" +
          "- Requires a valid access token.\n" +
          "- Pass JWT as `Authorization: Bearer <token>`.\n\n" +
          "### Email Change Behaviour\n" +
          "- If `email` is provided and different from the current email:\n" +
          "  - System checks if the new email is already in use by another owner.\n" +
          "  - Owner account must be active; otherwise a `403` is returned.\n" +
          "  - `emailVerifyVersion` is incremented and an email change **verification link** is generated.\n" +
          "  - The actual email on the account is **not** updated immediately.\n" +
          "  - Response will set `emailVerificationRequired = true` and return `emailChangeLink`.\n\n" +
          "### Phone Change Behaviour\n" +
          "- Phone cannot be sent directly in the body.\n" +
          "- To change phone number, send `phoneVerificationToken` obtained after successful OTP verification.\n" +
          "- The token encodes `isVerified` and the normalized phone number (digits only, with country code, e.g. `919876543210`).\n" +
          "- If the decoded phone is different from the current one:\n" +
          "  - System checks that the phone is not already linked to another owner profile.\n" +
          "  - On success, the phone number is updated and `phoneChanged = true` is returned.\n\n" +
          "### Email vs Phone Update Rule\n" +
          "- You **cannot** change email and phone at the same time.\n" +
          "- If both `email` and `phoneVerificationToken` are effectively changing values in the same request, a `400` error is returned with:\n" +
          "  - `\"You can update either email or phone at a time, not both\"`.\n\n" +
          "### Other Fields\n" +
          "- `fullName`, `photoUrl`, `preferredLanguage`, and `shortBio` are updated normally when provided.\n" +
          "- `shortBio` supports `null` to explicitly clear the bio.\n\n" +
          "### Failure Cases\n" +
          "- `400`:\n" +
          "  - No changes provided to update.\n" +
          "  - Both email and phone are requested to change in the same call.\n" +
          "- `403`:\n" +
          "  - Email change requested while owner account is not active.\n" +
          "- `404`:\n" +
          "  - Owner not found.\n" +
          "  - Owner profile not found when trying to update profile fields.\n" +
          "- `409`:\n" +
          "  - Email already in use.\n" +
          "  - Phone number already in use by another owner.\n" +
          "- `500`:\n" +
          "  - Unexpected server or database error while updating owner profile.\n\n" +
          "### Success Responses\n" +
          "- Email change only:\n" +
          "  - `200` with `emailVerificationRequired = true` and `emailChangeLink` set.\n" +
          "- Phone change only:\n" +
          "  - `200` with `phoneChanged = true`.\n" +
          "- Other profile updates only:\n" +
          "  - `200` with updated `owner` object and flags set accordingly.",

        security: [{ bearerAuth: [] }],

        // 🔹 Request body schema (AJV + Swagger)
        body: OwnerProfileUpdateSchema,

        // 🔹 Response schema (200 / 400 / 403 / 404 / 409 / 500)
        response: ResponseSchema.UpdateOwnerProfileResponseSchema,
      },
    },
    UpdateOwnerProfileController
  );

  fastify.get(
    "/verify-email-change",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Owner"],
        summary: "Owner Email Change Verification",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>",
        querystring: EmailVerificationSchema,
        response: ResponseSchema.VerifyOwnerEmailChangeResponseSchema,
      }
    },
    verifyEmailChangeController
  );

  fastify.get(
    "/profile",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Owner"],
        summary: "Owner Profile Retrieval",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>",
        querystring: getOwnerProfileSchema,
        security: [{ bearerAuth: [] }],
        response: ResponseSchema.GetOwnerProfileResponseSchema,
      }
    },
    getOwnerProfileController
  );
}

export default ownerProfileRoute;