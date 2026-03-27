import type { FastifyPluginAsync } from "fastify";
import ownerProfileRoute from "./OwnerProfile.route.js";
import customerProfileRoute from "./CustomerProfile.route.js";
import adminPlatformReviewRoute from "./AdminPlatformReview.route.js";
import platformReviewRoute from "./PlatformReview.route.js";

const routes: FastifyPluginAsync = async (fastify) => {

  await fastify.get("/health", async () => {
    return { status: "health ok" };
  });

  await fastify.get("/", async () => {
    return {
      status: "Profile Service is running",
    };
  });

  await fastify.register(ownerProfileRoute, {
    prefix: "/owner",
  });

  await fastify.register(customerProfileRoute, {
    prefix: "/customer",
  });

  await fastify.register(adminPlatformReviewRoute, {
    prefix: "/admin/platform-reviews",
  });

  await fastify.register(platformReviewRoute, {
    prefix: "/platform-reviews",
  });
};
 

export default routes;

