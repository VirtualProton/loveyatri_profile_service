import { FastifyPluginAsync } from "fastify";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { OwnerProfileSchema, ResponseSchema } from "../schema/OwnerProfile.schema.js";
import { OwnerProfileController } from "../controllers/OwnerProfile.controller.js";

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
}

export default ownerProfileRoute;