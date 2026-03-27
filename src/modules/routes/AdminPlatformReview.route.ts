import { FastifyPluginAsync } from "fastify";
import {
  authenticateToken,
  requireAdminRole,
} from "../../middleware/authMiddleware.js";
import {
  createPlatformReviewController,
  deletePlatformReviewController,
  updatePlatformReviewController,
} from "../controllers/AdminPlatformReview.controller.js";
import {
  CreatePlatformReviewBodySchema,
  DeletePlatformReviewResponseSchema,
  PlatformReviewParamsSchema,
  PlatformReviewResponseSchema,
  UpdatePlatformReviewBodySchema,
} from "../schema/AdminPlatformReview.schema.js";

const adminPlatformReviewRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: {
      rating: number;
      title: string;
      review: string;
    };
  }>(
    "/",
    {
      preHandler: [authenticateToken, requireAdminRole],
      schema: {
        tags: ["Admin Platform Review"],
        summary: "Create platform review",
        description:
          "Create a platform review entry as an authenticated admin or super admin.",
        security: [{ bearerAuth: [] }],
        body: CreatePlatformReviewBodySchema,
        response: PlatformReviewResponseSchema,
      },
    },
    createPlatformReviewController
  );

  fastify.put<{
    Params: {
      reviewId: string;
    };
    Body: {
      rating?: number;
      title?: string;
      review?: string;
    };
  }>(
    "/:reviewId",
    {
      preHandler: [authenticateToken, requireAdminRole],
      schema: {
        tags: ["Admin Platform Review"],
        summary: "Update platform review",
        description:
          "Update rating, title, or review text for an existing platform review.",
        security: [{ bearerAuth: [] }],
        params: PlatformReviewParamsSchema,
        body: UpdatePlatformReviewBodySchema,
        response: PlatformReviewResponseSchema,
      },
    },
    updatePlatformReviewController
  );

  fastify.delete<{
    Params: {
      reviewId: string;
    };
  }>(
    "/:reviewId",
    {
      preHandler: [authenticateToken, requireAdminRole],
      schema: {
        tags: ["Admin Platform Review"],
        summary: "Delete platform review",
        description:
          "Soft delete a platform review by marking it deleted and storing admin audit fields.",
        security: [{ bearerAuth: [] }],
        params: PlatformReviewParamsSchema,
        response: DeletePlatformReviewResponseSchema,
      },
    },
    deletePlatformReviewController
  );
};

export default adminPlatformReviewRoute;
