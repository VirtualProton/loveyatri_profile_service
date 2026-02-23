import { FastifyPluginAsync } from "fastify";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { CustomerProfileResponseSchema, CustomerProfileSchema } from "../schema/CustomerProfile.schema.js";
import { CustomerProfileController } from "../controllers/CustomerProfile.controller.js";
import { CustomerProfileUpdateSchema, ResponseSchema as UpdateResponseSchema } from "../schema/CustomerProfileUpdate.schema.js";
import { CustomerProfileGetQuerySchema, ResponseSchema as GetResponseSchema } from "../schema/CustomerProfileGet.schema.js";
import { CustomerProfileGetController } from "../controllers/CustomerProfileGet.controller.js";
import { CustomerProfileUpdateController, VerifyCustomerEmailChangeController } from "../controllers/CustomerProfileUpdate.controller.js";

const customerProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: "POST",
    url: "/create",

    // 🔐 Auth — only authenticated customers
    preHandler: [authenticateToken],

    schema: {
      tags: ["Profile Customer"],
      summary: "Create customer profile",
      description:
        "Create a profile for the authenticated customer.\n\n" +
        "### Authorization\n" +
        "- Requires a valid access token.\n" +
        "- Pass JWT as `Authorization: Bearer <token>`.\n\n" +
        "### Phone Verification\n" +
        "- `verificationToken` is a **separate JWT** issued after successful phone OTP verification.\n" +
        "- The token encodes `isVerified` and the normalized phone number (with country code, e.g. `919876543210`).\n" +
        "- If this token is missing, invalid, or expired, the request will be rejected.\n\n" +
        "### Behaviour\n" +
        "- Uses the phone number from `verificationToken`; client must **not** send phone directly.\n" +
        "- Fails if:\n" +
        "  - Customer does not exist (`404`).\n" +
        "  - Customer already has a profile (`409`).\n" +
        "  - Phone number is already linked to another profile (`409`).\n" +
        "  - Token is invalid/expired (`400`).\n" +
        "- On success:\n" +
        "  - Creates a `CustomerProfile` row.\n" +
        "  - Sets `Customer.isProfileComplete = true`.\n" +
        "  - Sets `Customer.isActive = true`.",

      security: [{ bearerAuth: [] }],

      // 🔹 Request body schema (AJV + Swagger)
      body: CustomerProfileSchema,

      // 🔹 Response schema (200 / 400 / 404 / 409 / 500)
      response: CustomerProfileResponseSchema,
      // or: response: CreateResponseSchema.CustomerProfileResponseSchema,
    },

    handler: CustomerProfileController,
  });

  fastify.put(
    "/update",
    {
      preHandler: [authenticateToken],
      schema: {
        tags: ["Profile Customer"],
        summary: "Update customer profile",
        description:
          "Update profile details for the authenticated customer.\n\n" +
          "### Authorization\n" +
          "- Requires a valid access token.\n" +
          "- Pass JWT as `Authorization: Bearer <token>`.\n\n" +
          "### What can be updated\n" +
          "- Basic profile fields:\n" +
          "  - `fullName`\n" +
          "  - `photoUrl`\n" +
          "  - `address`\n" +
          "- Email:\n" +
          "  - Provide a new `email`.\n" +
          "  - Must be unique across all customers.\n" +
          "  - Customer must be **active** to change email.\n" +
          "  - A verification link is generated (`emailChangeLink`) and must be used to confirm the change.\n" +
          "- Phone:\n" +
          "  - Provide a `verificationToken` (JWT) that was issued after successful phone OTP verification.\n" +
          "  - The token must contain `{ isVerified: true, phone: <normalizedPhone> }`.\n" +
          "  - Phone is updated immediately if unique.\n\n" +
          "### Important rules\n" +
          "- `customerId` is required in the request body.\n" +
          "- You may update **either** email **or** phone in a single request, **not both**.\n" +
          "- If neither email nor phone is changing, you can still update `fullName`, `photoUrl`, and `address`.\n\n" +
          "### Responses\n" +
          "- **200 OK**:\n" +
          "  - Returns the updated `customer` with nested `CustomerProfile`.\n" +
          "  - `emailChangeLink` is non-null when an email change flow was triggered.\n" +
          "  - `phoneChanged` is `true` when phone was updated using a valid `verificationToken`.\n" +
          "- **400 Bad Request**:\n" +
          "  - No changes provided.\n" +
          "  - Invalid or expired `verificationToken`.\n" +
          "  - Attempt to change both email and phone in the same request.\n" +
          "- **403 Forbidden**:\n" +
          "  - Trying to change email while the account is not active.\n" +
          "- **404 Not Found**:\n" +
          "  - Customer does not exist.\n" +
          "  - Customer profile does not exist (in flows that require it).\n" +
          "- **409 Conflict**:\n" +
          "  - Email or phone is already in use by another customer.\n" +
          "- **500 Internal Server Error**:\n" +
          "  - Unexpected error while updating customer or profile.",

        security: [{ bearerAuth: [] }],

        body: CustomerProfileUpdateSchema,

        response: UpdateResponseSchema.CustomerProfileUpdateResponseSchema,
      },
    },
    CustomerProfileUpdateController
  );


  fastify.get(
    "/verify-email-change",
    {
      schema: {
        tags: ["Profile Customer"],
        summary: "Verify email change",
        description:
          "Verify customer email change using the token sent to the new email address",
        querystring: {
          type: "object",
          required: ["token"],
          properties: {
            token: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "message", "customer"],
            properties: {
              success: { type: "boolean", example: true },
              message: {
                type: "string",
                example: "Email address updated successfully",
              },
              customer: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  fullName: { type: "string" },
                  email: { type: "string" },
                  isActive: { type: "boolean" },
                  isProfileComplete: { type: "boolean" },
                  profile: { type: ["object", "null"] },
                },
              },
            },
          },
          400: {
            type: "object",
            required: ["success", "message"],
            properties: {
              success: { type: "boolean", example: false },
              message: {
                type: "string",
                example: "Invalid or expired email change token",
              },
            },
          },
          404: {
            type: "object",
            required: ["success", "message"],
            properties: {
              success: { type: "boolean", example: false },
              message: {
                type: "string",
                example: "Customer not found",
              },
            },
          },
          409: {
            type: "object",
            required: ["success", "message"],
            properties: {
              success: { type: "boolean", example: false },
              message: {
                type: "string",
                example: "Email already in use",
              },
            },
          },
          500: {
            type: "object",
            required: ["success", "message"],
            properties: {
              success: { type: "boolean", example: false },
              message: {
                type: "string",
                example: "Failed to verify email change",
              },
            },
          },
        },
      },
    },
    VerifyCustomerEmailChangeController
  );



  fastify.get(
    "/profile",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Customer"],
        summary: "Get Customer Details",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>",
        querystring: CustomerProfileGetQuerySchema,
        security: [{ bearerAuth: [] }],
        response: GetResponseSchema.CustomerProfileGetResponseSchema,
      }
    },
    CustomerProfileGetController
  );
}

export default customerProfileRoute;
