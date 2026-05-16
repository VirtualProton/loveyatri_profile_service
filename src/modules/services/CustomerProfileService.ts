import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  buildEmailChangeLink,
  emailChangeToken,
} from "../../utils/generateEmailVerificationToken.js";

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    throw new AppError(400, "Email is required.");
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new AppError(400, "Invalid email format.");
  }

  return normalized;
}

export type CreateCustomerProfileInput = {
  customerId: string;
  photoUrl: string;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

export const CustomerProfileService = async (
  data: CreateCustomerProfileInput
) => {
  const { customerId, photoUrl, email, address, city, state } = data;

  try {
    if (!customerId || typeof customerId !== "string") {
      throw new AppError(400, "Valid customerId is required.");
    }

    if (!photoUrl || typeof photoUrl !== "string") {
      throw new AppError(400, "Valid photoUrl is required.");
    }

    const normalizedPhotoUrl = photoUrl.trim();

    if (!normalizedPhotoUrl) {
      throw new AppError(400, "Valid photoUrl is required.");
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = normalizeNullableText(address);
    const normalizedCity = normalizeNullableText(city);
    const normalizedState = normalizeNullableText(state);

    return await prisma.$transaction(async (tx) => {
      const existingCustomer = await tx.customer.findUnique({
        where: { id: customerId },
        select: {
          isProfileComplete: true,
        },
      });

      if (!existingCustomer) {
        throw new AppError(404, "Customer not found.");
      }

      if (existingCustomer.isProfileComplete) {
        throw new AppError(409, "Profile already completed.");
      }

      const emailExistsInProfile = await tx.customerProfile.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (emailExistsInProfile) {
        throw new AppError(409, "Email already in use.");
      }

      const profile = await tx.customerProfile.create({
        data: {
          customerId,
          photoUrl: normalizedPhotoUrl,
          email: normalizedEmail,
          address: normalizedAddress ?? null,
          city: normalizedCity ?? null,
          state: normalizedState ?? null,
        },
        include: {
          Customer: {
            select: {
              fullName: true,
              isActive: true,
            },
          },
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          isProfileComplete: true,
        },
      });

      const updatedForVersion = await tx.customerProfile.update({
        where: { customerId },
        data: {
          emailVerifyVersion: {
            increment: 1,
          },
        },
        select: {
          emailVerifyVersion: true,
        },
      });

      const token = emailChangeToken({
        customerId,
        newEmail: normalizedEmail,
        oldEmail: normalizedEmail,
        version: updatedForVersion.emailVerifyVersion,
      });

      return {
        profile,
        emailChangeLink: buildEmailChangeLink(token),
      };
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = (err.meta?.target ?? "") as string | string[];
        const targets = Array.isArray(target) ? target : [target];

        if (targets.some((t) => t.toLowerCase().includes("email"))) {
          throw new AppError(409, "Email already in use.");
        }

        if (targets.some((t) => t.includes("customerId"))) {
          throw new AppError(409, "Customer already has a profile.");
        }

        throw new AppError(409, "Resource already exists.");
      }

      throw new AppError(
        500,
        "Database error while creating customer profile."
      );
    }

    console.error("CustomerProfileService unexpected error:", err);

    throw new AppError(
      500,
      "Customer profile creation failed. Please try again later."
    );
  }
};
