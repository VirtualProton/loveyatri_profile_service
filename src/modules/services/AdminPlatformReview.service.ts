import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";

const platformReviewSelect = {
  id: true,
  rating: true,
  title: true,
  review: true,
  isDeleted: true,
  deletedAt: true,
  createdByAdminId: true,
  updatedByAdminId: true,
  deletedByAdminId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlatformReviewSelect;

function normalizeRating(rating: number | undefined, required = false) {
  if (rating === undefined) {
    if (required) {
      throw new AppError(400, "rating is required.");
    }

    return undefined;
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(400, "rating must be an integer between 1 and 5.");
  }

  return rating;
}

function normalizeText(
  value: string | undefined,
  fieldName: "title" | "review",
  options: { required?: boolean; maxLength?: number } = {}
) {
  const { required = false, maxLength } = options;

  if (value === undefined) {
    if (required) {
      throw new AppError(400, `${fieldName} is required.`);
    }

    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new AppError(400, `${fieldName} cannot be empty.`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new AppError(400, `${fieldName} must be at most ${maxLength} characters.`);
  }

  return trimmed;
}

async function ensureAdminExists(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true },
  });

  if (!admin) {
    throw new AppError(404, "Admin not found.");
  }
}

async function getActivePlatformReview(reviewId: string) {
  const platformReview = await prisma.platformReview.findFirst({
    where: {
      id: reviewId,
      isDeleted: false,
    },
    select: platformReviewSelect,
  });

  if (!platformReview) {
    throw new AppError(404, "Platform review not found.");
  }

  return platformReview;
}

export const createPlatformReviewService = async (data: {
  adminId: string;
  rating: number;
  title: string;
  review: string;
}) => {
  const rating = normalizeRating(data.rating, true)!;
  const title = normalizeText(data.title, "title", {
    required: true,
    maxLength: 255,
  })!;
  const review = normalizeText(data.review, "review", {
    required: true,
  })!;

  try {
    await ensureAdminExists(data.adminId);

    return await prisma.platformReview.create({
      data: {
        rating,
        title,
        review,
        createdByAdminId: data.adminId,
      },
      select: platformReviewSelect,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError(500, "Database error while creating platform review.");
    }

    throw new AppError(
      500,
      "Failed to create platform review: " + (err?.message || "Unexpected error")
    );
  }
};

export const updatePlatformReviewService = async (data: {
  adminId: string;
  reviewId: string;
  rating?: number;
  title?: string;
  review?: string;
}) => {
  const rating = normalizeRating(data.rating);
  const title = normalizeText(data.title, "title", {
    maxLength: 255,
  });
  const review = normalizeText(data.review, "review");

  if (rating === undefined && title === undefined && review === undefined) {
    throw new AppError(
      400,
      "At least one field among rating, title, or review must be provided."
    );
  }

  try {
    await ensureAdminExists(data.adminId);
    await getActivePlatformReview(data.reviewId);

    return await prisma.platformReview.update({
      where: { id: data.reviewId },
      data: {
        ...(rating !== undefined ? { rating } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(review !== undefined ? { review } : {}),
        updatedByAdminId: data.adminId,
      },
      select: platformReviewSelect,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        throw new AppError(404, "Platform review not found.");
      }

      throw new AppError(500, "Database error while updating platform review.");
    }

    throw new AppError(
      500,
      "Failed to update platform review: " + (err?.message || "Unexpected error")
    );
  }
};

export const deletePlatformReviewService = async (data: {
  adminId: string;
  reviewId: string;
}) => {
  try {
    await ensureAdminExists(data.adminId);
    await getActivePlatformReview(data.reviewId);

    return await prisma.platformReview.update({
      where: { id: data.reviewId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByAdminId: data.adminId,
        updatedByAdminId: data.adminId,
      },
      select: platformReviewSelect,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        throw new AppError(404, "Platform review not found.");
      }

      throw new AppError(500, "Database error while deleting platform review.");
    }

    throw new AppError(
      500,
      "Failed to delete platform review: " + (err?.message || "Unexpected error")
    );
  }
};
