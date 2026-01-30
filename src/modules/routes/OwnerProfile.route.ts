import { FastifyPluginAsync } from "fastify";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { EmailVerificationSchema, getOwnerProfileSchema, OwnerProfileSchema, OwnerProfileUpdateSchema, ResponseSchema } from "../schema/OwnerProfile.schema.js";
import { getOwnerProfileController, OwnerProfileController, UpdateOwnerProfileController, verifyEmailChangeController } from "../controllers/OwnerProfile.controller.js";

const ownerProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/create",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Owner"],
        summary: "Owner Profile Creation",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>",
        body: OwnerProfileSchema,
        security: [{ bearerAuth: [] }],
        response: ResponseSchema.OwnerProfileResponseSchema,
      }
    },
    OwnerProfileController
  );

  fastify.put(
    "/update",
    {
      preHandler: authenticateToken,
      schema: {
        tags: ["Profile Owner"],
        summary: "Owner Profile Update",
        description: "🔐 Authorization required. Pass JWT as: Bearer <token>",
        body: OwnerProfileUpdateSchema,
        security: [{ bearerAuth: [] }],
        response: ResponseSchema.UpdateOwnerProfileResponseSchema,
      }
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