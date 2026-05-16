import type { FastifyReply, FastifyRequest } from "fastify";
import { CustomerProfileGetService } from "../services/CustomerProfileGetService.js";
import { AppError } from "../../utils/appError.js";

export const CustomerProfileGetController = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const customerId = req.user?.id;

    if (!customerId) {
      throw new AppError(401, "Unauthorized");
    }

    const customer = await CustomerProfileGetService(customerId);

    return reply.code(200).send({
      success: true,
      message: "Customer details retrieved successfully",
      customer,
    });
  } catch (err: any) {
    return reply.status(err.statusCode || 500).send({
      success: false,
      message: err.message,
    });
  }
};
