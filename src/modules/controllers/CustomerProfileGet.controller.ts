import type { FastifyReply, FastifyRequest } from "fastify";
import { CustomerProfileGetRequest } from "../../types.js";
import { CustomerProfileGetService } from "../services/CustomerProfileGetService.js";

export const CustomerProfileGetController = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { customerId } = req.query as CustomerProfileGetRequest["body"];
    try {
        const customer = await CustomerProfileGetService(customerId);
        return reply.code(200).send({
            success: true,
            message: "Customer details retrieved successfully",
            customer: customer
        });
    } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
            success: false,
            message: err.message,
        });
    }
}
