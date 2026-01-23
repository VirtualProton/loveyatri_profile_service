import { FastifyPluginAsync } from "fastify";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { CustomerProfileSchema, ResponseSchema as CreateResponseSchema } from "../schema/CustomerProfile.schema.js";
import { CustomerProfileController } from "../controllers/CustomerProfile.controller.js";
import { CustomerProfileUpdateSchema, ResponseSchema as UpdateResponseSchema } from "../schema/CustomerProfileUpdate.schema.js";
// import { CustomerProfileUpdateController } from "../controllers/CustomerProfileUpdate.controller.js";
import { CustomerProfileGetQuerySchema, ResponseSchema as GetResponseSchema } from "../schema/CustomerProfileGet.schema.js";
import { CustomerProfileGetController } from "../controllers/CustomerProfileGet.controller.js";

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

  // fastify.put(
  //   "/update",
  //   {
  //     preHandler: authenticateToken,
  //     schema: {
  //       tags: ["Profile Customer"],
  //       summary: "Customer Profile Update",
  //       description: "🔐 Authorization required. Pass JWT as: Bearer <token>. Email update requires verification if customer is active.",
  //       body: CustomerProfileUpdateSchema,
  //       security: [{ bearerAuth: [] }],
  //       response: UpdateResponseSchema.CustomerProfileUpdateResponseSchema,  
  //     }
  //   },
  //   CustomerProfileUpdateController
  // );

  fastify.get(
    "/details",
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
