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
        "### Email Verification\n" +
        "- `email` is required.\n" +
        "- A verification link is generated for the provided email address.\n\n" +
        "### Behaviour\n" +
        "- Uses `req.user.id` from the access token as the customer id.\n" +
        "- Client must **not** send `customerId` in the request body.\n" +
        "- Optional profile fields may include `address`, `city`, and `state`.\n" +
        "- Fails if:\n" +
        "  - Customer does not exist (`404`).\n" +
        "  - Customer already has a profile (`409`).\n" +
        "  - Email is already linked to another profile (`409`).\n" +
        "- On success:\n" +
        "  - Creates a `CustomerProfile` row.\n" +
        "  - Sets `Customer.isProfileComplete = true`.\n" +
        "  - Generates an email verification link.",

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
          "  - `city`\n" +
          "  - `state`\n" +
          "  - `countryCode`\n" +
          "- Email:\n" +
          "  - Provide a new `email`.\n" +
          "  - Must be unique across all customers.\n" +
          "  - Customer must be **active** to change email.\n" +
          "  - A verification link is generated (`emailChangeLink`) and must be used to confirm the change.\n" +
          "- Phone:\n" +
          "  - Provide `verificationToken` from the phone OTP verification flow.\n" +
          "  - The phone number is read from the verified token; clients must not send phone directly.\n" +
          "### Important rules\n" +
          "- Uses `req.user.id` from the access token as the customer id.\n" +
          "- Client must **not** send `customerId` in the request body.\n" +
          "- If email is not changing, you can still update `fullName`, `photoUrl`, `address`, `city`, `state`, `countryCode`, and phone.\n\n" +
          "### Responses\n" +
          "- **200 OK**:\n" +
          "  - Returns the updated `customer` with nested `CustomerProfile`.\n" +
          "  - `emailChangeLink` is non-null when an email change flow was triggered.\n" +
          "  - `phoneChanged` is true when phone was updated from `verificationToken`.\n" +
          "- **400 Bad Request**:\n" +
          "  - No changes provided.\n" +
          "  - Invalid or expired `verificationToken`.\n" +
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
          "Verify customer email change using the JWT token from the `emailChangeLink` sent to the new email address.",
        querystring: {
          type: "object",
          required: ["token"],
          properties: {
            token: {
              type: "string",
              description:
                "Email change JWT token. Pass only the token value, not the whole update curl command.",
              example:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcklkIjoiY3VzdG9tZXItdXVpZCIsIm5ld0VtYWlsIjoibmV3ZW1haWxAZXhhbXBsZS5jb20ifQ.signature",
            },
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
                additionalProperties: false,
                required: [
                  "id",
                  "fullName",
                  "phone",
                  "countryCode",
                  "isActive",
                  "isProfileComplete",
                  "CustomerProfile",
                ],
                properties: {
                  id: { type: "string" },
                  fullName: { type: "string" },
                  phone: {
                    type: "string",
                    example: "919876543210",
                    description: "Normalized phone number with digits only.",
                  },
                  countryCode: {
                    type: "string",
                    example: "+91",
                    description: "Customer country calling code.",
                  },
                  isActive: { type: "boolean" },
                  isProfileComplete: { type: "boolean" },
                  CustomerProfile: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    properties: {
                      id: { type: "string", example: "profile-uuid" },
                      customerId: { type: "string", example: "customer-uuid" },
                      email: {
                        type: "string",
                        format: "email",
                        example: "newemail@example.com",
                      },
                      photoUrl: {
                        type: ["string", "null"],
                        example: "https://cdn.example.com/profile.jpg",
                      },
                      address: {
                        type: ["string", "null"],
                        example: "123 Main Street, Hyderabad, Telangana, 500001",
                      },
                      city: {
                        type: ["string", "null"],
                        example: "Hyderabad",
                      },
                      state: {
                        type: ["string", "null"],
                        example: "Telangana",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                      },
                      updatedAt: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
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
        description:
          "Get details for the authenticated customer.\n\n" +
          "### Authorization\n" +
          "- Requires a valid access token.\n" +
          "- Pass JWT as `Authorization: Bearer <token>`.\n\n" +
          "### Important rules\n" +
          "- Uses `req.user.id` from the access token as the customer id.\n" +
          "- Client must **not** send `customerId` as a query parameter.",
        querystring: CustomerProfileGetQuerySchema,
        security: [{ bearerAuth: [] }],
        response: GetResponseSchema.CustomerProfileGetResponseSchema,
      }
    },
    CustomerProfileGetController
  );
}

export default customerProfileRoute;
