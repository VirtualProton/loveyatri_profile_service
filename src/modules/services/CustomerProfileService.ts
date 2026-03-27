import jwt from "jsonwebtoken";
import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { env } from "../../config/env.js";
import { Prisma } from "../../generated/prisma/client.js";

type PhoneVerificationTokenPayload = {
  isVerified: boolean;
  phone: string; // normalized phone with country code, e.g. "919876543210"
};

const PHONE_VERIFICATION_TOKEN_SECRET = env.JWT_SECRET;

/**
 * Decode and validate the phone verification token.
 * Throws AppError with proper status codes on any problem.
 */
function decodePhoneVerificationToken(
  token: string
): PhoneVerificationTokenPayload {
  if (!PHONE_VERIFICATION_TOKEN_SECRET) {
    throw new AppError(
      500,
      "Phone verification is temporarily unavailable. Please try again later."
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      PHONE_VERIFICATION_TOKEN_SECRET
    ) as jwt.JwtPayload | string;

    if (!decoded || typeof decoded === "string") {
      throw new AppError(400, "Invalid phone verification token.");
    }

    const { isVerified, phone } =
      decoded as Partial<PhoneVerificationTokenPayload>;

    if (typeof isVerified !== "boolean" || typeof phone !== "string") {
      throw new AppError(400, "Invalid phone verification token payload.");
    }

    return {
      isVerified,
      phone: phone.trim(),
    };
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      throw new AppError(
        400,
        "Phone verification token has expired. Please verify your phone number again."
      );
    }

    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(400, "Invalid phone verification token.");
  }
}

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

function normalizeCountryCode(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.startsWith("+")
    ? `+${trimmed.slice(1).replace(/\D/g, "")}`
    : `+${trimmed.replace(/\D/g, "")}`;

  if (!/^\+\d{1,4}$/.test(normalized)) {
    throw new AppError(400, "Invalid country code. It must be like +91, +1, etc.");
  }

  return normalized;
}

export type CreateCustomerProfileInput = {
  customerId: string;
  photoUrl: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  verificationToken?: string;
};

export const CustomerProfileService = async (
  data: CreateCustomerProfileInput
) => {
  const {
    customerId,
    photoUrl,
    address,
    city,
    state,
    countryCode,
    verificationToken,
  } = data;

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

    if (!verificationToken || typeof verificationToken !== "string") {
      throw new AppError(
        400,
        "Phone number not verified. verificationToken missing or invalid."
      );
    }

    const { isVerified, phone } = decodePhoneVerificationToken(
      verificationToken
    );

    if (!isVerified) {
      throw new AppError(
        400,
        "Phone number not verified. Verification required."
      );
    }

    if (!phone || typeof phone !== "string") {
      throw new AppError(
        400,
        "Phone number not verified. Invalid phone in token."
      );
    }

    const normalizedPhone = phone.trim();
    const normalizedAddress = normalizeNullableText(address);
    const normalizedCity = normalizeNullableText(city);
    const normalizedState = normalizeNullableText(state);
    const normalizedCountryCode = normalizeCountryCode(countryCode);

    const profile = await prisma.$transaction(async (tx) => {
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

      const phoneExists = await tx.customerProfile.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      });

      if (phoneExists) {
        throw new AppError(409, "Phone number already in use.");
      }

      const createdProfile = await tx.customerProfile.create({
        data: {
          customerId,
          photoUrl: normalizedPhotoUrl,
          phone: normalizedPhone,
          ...(normalizedCountryCode !== undefined
            ? { countryCode: normalizedCountryCode }
            : {}),
          address: normalizedAddress ?? null,
          city: normalizedCity ?? null,
          state: normalizedState ?? null,
        },
        include: {
          Customer: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          isProfileComplete: true,
          isActive: true,
        },
      });

      return createdProfile;
    });

    return profile;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = (err.meta?.target ?? "") as string | string[];
        const targets = Array.isArray(target) ? target : [target];

        if (targets.some((t) => t.includes("phone"))) {
          throw new AppError(409, "Phone number already in use.");
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
