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

  fastify.route({
    method: "PUT",
    url: "/update",

    // 🔐 Auth — only authenticated admins (owners)
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
        "  - `emailVerifyVersion` is incremented.\n" +
        "  - A verification link is generated.\n" +
        "  - The email is NOT updated immediately.\n" +
        "  - Response returns `emailVerificationRequired = true`.\n\n" +

        "### Phone Change Behaviour\n" +
        "- Phone cannot be sent directly in the body.\n" +
        "- To change phone number, send `phoneVerificationToken`.\n" +
        "- The token must come from successful OTP verification.\n" +
        "- If valid and different from current phone:\n" +
        "  - System checks uniqueness.\n" +
        "  - Phone is updated.\n" +
        "  - Response returns `phoneChanged = true`.\n\n" +

        "### Email vs Phone Rule\n" +
        "- You cannot update email and phone at the same time.\n" +
        "- If both are requested to change, a `400` error is returned.\n\n" +

        "### Other Profile Fields\n" +
        "- `fullName`, `photoUrl`, `preferredLanguage` update normally.\n" +
        "- `shortBio` supports `null` to clear.\n\n" +

        "### GST & Billing\n" +
        "- `isGstRegistered`, `gstNumber`, `gstLegalName`, `gstStateCode`, `gstBillingAddress`, and `pincode` can be updated.\n" +
        "- If `isGstRegistered = true`, GST fields are validated.\n" +
        "- If `isGstRegistered = false`, GST details are cleared.\n" +
        "- Optional GST fields support `null` to clear values.\n\n" +

        "### Country Code\n" +
        "- `countryCode` can be updated (e.g. `+91`, `+1`).\n" +
        "- Sending `null` does not override existing value (non-nullable column).\n\n" +

        "### Failure Cases\n" +
        "- `400`:\n" +
        "  - No changes provided.\n" +
        "  - Both email and phone requested in same call.\n" +
        "  - Invalid GST or pincode format.\n" +
        "- `403`: Email change while account inactive.\n" +
        "- `404`: Owner or profile not found.\n" +
        "- `409`: Email / Phone / GST number already in use.\n" +
        "- `500`: Unexpected server/database error.\n\n" +

        "### Success Cases\n" +
        "- Email change → `emailVerificationRequired = true`.\n" +
        "- Phone change → `phoneChanged = true`.\n" +
        "- Other updates → flags set to false and updated owner returned.",

      security: [{ bearerAuth: [] }],

      // 🔹 Request body schema
      body: OwnerProfileUpdateSchema,

      // 🔹 Response schema
      response: ResponseSchema.UpdateOwnerProfileResponseSchema,
    },

    handler: UpdateOwnerProfileController,
  });

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