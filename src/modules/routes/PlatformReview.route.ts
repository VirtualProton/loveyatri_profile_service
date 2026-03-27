import { FastifyPluginAsync } from "fastify";
import {
  getPlatformReviewController,
  listPlatformReviewsController,
} from "../controllers/PlatformReview.controller.js";
import {
  PlatformReviewDetailResponseSchema,
  PlatformReviewListResponseSchema,
  PlatformReviewParamsSchema,
} from "../schema/AdminPlatformReview.schema.js";

const platformReviewRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Platform Review"],
        summary: "List platform reviews",
        description:
          "Fetch active platform reviews along with admin name, city, and profile photo.",
        response: PlatformReviewListResponseSchema,
      },
    },
    listPlatformReviewsController
  );

  fastify.get<{
    Params: {
      reviewId: string;
    };
  }>(
    "/:reviewId",
    {
      schema: {
        tags: ["Platform Review"],
        summary: "Get platform review",
        description:
          "Fetch a single active platform review along with admin name, city, and profile photo.",
        params: PlatformReviewParamsSchema,
        response: PlatformReviewDetailResponseSchema,
      },
    },
    getPlatformReviewController
  );
};

export default platformReviewRoute;
