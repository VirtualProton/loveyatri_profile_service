import type { FastifyPluginAsync } from "fastify";
import ownerProfileRoute from "./OwnerProfile.route.js";
import customerProfileRoute from "./CustomerProfile.route.js";

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
};
 

export default routes;

