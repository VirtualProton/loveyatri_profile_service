import type { FastifyPluginAsync } from "fastify";
import ownerProfileRoute from "./OwnerProfile.route.js";

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
};
 

export default routes;

