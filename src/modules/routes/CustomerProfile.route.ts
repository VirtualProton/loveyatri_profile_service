import { FastifyPluginAsync } from "fastify";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { CustomerProfileSchema, ResponseSchema as CreateResponseSchema } from "../schema/CustomerProfile.schema.js";
import { CustomerProfileController } from "../controllers/CustomerProfile.controller.js";
import { CustomerProfileUpdateSchema, ResponseSchema as UpdateResponseSchema } from "../schema/CustomerProfileUpdate.schema.js";
import { CustomerProfileGetQuerySchema, ResponseSchema as GetResponseSchema } from "../schema/CustomerProfileGet.schema.js";
import { CustomerProfileGetController } from "../controllers/CustomerProfileGet.controller.js";
import { CustomerProfileUpdateController, VerifyCustomerEmailChangeController } from "../controllers/CustomerProfileUpdate.controller.js";

const customerProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/create",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Customer"],
        summary: "Customer Profile Creation",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>",
        body: CustomerProfileSchema,
        security: [{ bearerAuth: [] }],
        response: CreateResponseSchema.CustomerProfileResponseSchema,
      }
    },
    CustomerProfileController
  );

  fastify.put(
    "/update",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Customer"],
        summary: "Customer Profile Update",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>. Email and phone update requires verification if customer is active.",
        body: CustomerProfileUpdateSchema,
        security: [{ bearerAuth: [] }],
        response: UpdateResponseSchema.CustomerProfileUpdateResponseSchema,
      }
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
