import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../utils/appError.js";
import {
  getPlatformReviewByIdService,
  listPlatformReviewsService,
} from "../services/AdminPlatformReview.service.js";

export const listPlatformReviewsController = async (
  _req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const platformReviews = await listPlatformReviewsService();

    return reply.status(200).send({
      success: true,
      message: "Platform reviews fetched successfully.",
      data: platformReviews,
    });
  } catch (err: any) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message =
      err instanceof AppError
        ? err.message
        : "Failed to fetch platform reviews.";

    return reply.status(statusCode).send({
      success: false,
      message,
    });
  }
};

export const getPlatformReviewController = async (
  req: FastifyRequest<{
    Params: {
      reviewId: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const platformReview = await getPlatformReviewByIdService(req.params.reviewId);

    return reply.status(200).send({
      success: true,
      message: "Platform review fetched successfully.",
      data: platformReview,
    });
  } catch (err: any) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message =
      err instanceof AppError
        ? err.message
        : "Failed to fetch platform review.";

    return reply.status(statusCode).send({
      success: false,
      message,
    });
  }
};
