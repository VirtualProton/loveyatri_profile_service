import Fastify from "fastify";
import cors from "@fastify/cors";

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import ajvErrors from "ajv-errors";
import { prisma } from "./utils/prisma.js";
import routes from "./modules/routes/route.js";


export async function buildApp(): Promise<Fastify.FastifyInstance<Fastify.RawServerDefault, import("node:http").IncomingMessage, import("node:http").ServerResponse<import("node:http").IncomingMessage>, Fastify.FastifyBaseLogger, Fastify.FastifyTypeProviderDefault>> {
  const app = Fastify({
    logger: {
      level: "info"
    },

    ajv: {
      customOptions: {
        allErrors: true,          // 🔴 REQUIRED
        strict: false             // recommended to avoid warnings
      },
      plugins: [ajvErrors]
    }
  });


  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully (raw query check)");
    app.log.info("✅ Database connected successfully (query check)");
  } catch (error) {
    app.log.error({ err: error }, "❌ Database connection failed");
    process.exit(1); // fail fast
  }

  // 🌟 AJV Enhancements
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Auth Service API",
        description: "Fastify + Prisma API Documentation",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3002",
          description: "Local server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });



  // 🌍 CORS
  await app.register(cors, {
    origin: true,
    credentials: true
  });

  // 🧪 Health check
  await app.register(routes, {
    prefix: "/v1/profile",
  });

  // 🔐 Auth routes
  //   app.register(authRoutes);

  return app;
}
