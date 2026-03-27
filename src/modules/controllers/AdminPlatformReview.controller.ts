import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  CreatePlatformReviewRequest,
  DeletePlatformReviewRequest,
  UpdatePlatformReviewRequest,
} from "../../types.js";
import { AppError } from "../../utils/appError.js";
import {
  createPlatformReviewService,
  deletePlatformReviewService,
  updatePlatformReviewService,
} from "../services/AdminPlatformReview.service.js";

function getAuthenticatedAdminId(req: FastifyRequest) {
  const adminId = req.user?.id;

  if (!adminId) {
    throw new AppError(401, "Authentication required");
  }

  return adminId;
}

export const createPlatformReviewController = async (
  req: CreatePlatformReviewRequest,
  reply: FastifyReply
) => {
  try {
    const adminId = getAuthenticatedAdminId(req);
    const platformReview = await createPlatformReviewService({
      adminId,
      ...req.body,
    });

    return reply.status(201).send({
      success: true,
      message: "Platform review created successfully.",
      data: platformReview,
    });
  } catch (err: any) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message =
      err instanceof AppError
        ? err.message
        : "Failed to create platform review.";

    return reply.status(statusCode).send({
      success: false,
      message,
    });
  }
};

export const updatePlatformReviewController = async (
  req: UpdatePlatformReviewRequest,
  reply: FastifyReply
) => {
  try {
    const adminId = getAuthenticatedAdminId(req);
    const platformReview = await updatePlatformReviewService({
      adminId,
      reviewId: req.params.reviewId,
      ...req.body,
    });

    return reply.status(200).send({
      success: true,
      message: "Platform review updated successfully.",
      data: platformReview,
    });
  } catch (err: any) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message =
      err instanceof AppError
        ? err.message
        : "Failed to update platform review.";

    return reply.status(statusCode).send({
      success: false,
      message,
    });
  }
};

export const deletePlatformReviewController = async (
  req: DeletePlatformReviewRequest,
  reply: FastifyReply
) => {
  try {
    const adminId = getAuthenticatedAdminId(req);
    const platformReview = await deletePlatformReviewService({
      adminId,
      reviewId: req.params.reviewId,
    });

    return reply.status(200).send({
      success: true,
      message: "Platform review deleted successfully.",
      data: platformReview,
    });
  } catch (err: any) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message =
      err instanceof AppError
        ? err.message
        : "Failed to delete platform review.";

    return reply.status(statusCode).send({
      success: false,
      message,
    });
  }
};
