import jwt from "jsonwebtoken";
import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { env } from "../../config/env.js";
import { Prisma } from "../../generated/prisma/client.js";

type PhoneVerificationTokenPayload = {
  isVerified: boolean;
  phone: string; // normalized phone with country code, e.g. "919876543210"
};

const PHONE_VERIFICATION_TOKEN_SECRET = env.JWT_SECRET

/**
 * Decode and validate the phone verification token.
 * Throws AppError with proper status codes on any problem.
 */
function decodePhoneVerificationToken(
  token: string
): PhoneVerificationTokenPayload {
  if (!PHONE_VERIFICATION_TOKEN_SECRET) {
    // Misconfiguration – treat as server error
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

    const { isVerified, phone } = decoded as Partial<PhoneVerificationTokenPayload>;

    if (typeof isVerified !== "boolean" || typeof phone !== "string") {
      throw new AppError(400, "Invalid phone verification token payload.");
    }

    return {
      isVerified,
      phone: phone.trim(),
    };
  } catch (err: any) {
    // Token-specific errors (expired, malformed, etc.)
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

export type CreateCustomerProfileInput = {
  customerId: string;
  photoUrl: string;
  address?: string | null;
  verificationToken?: string;
};

export const CustomerProfileService = async (
  data: CreateCustomerProfileInput
) => {
  const { customerId, photoUrl, address, verificationToken } = data;

  try {
    // 1️⃣ Basic input validation (defensive, even if you validate at controller/schema level)
    if (!customerId || typeof customerId !== "string") {
      throw new AppError(400, "Valid customerId is required.");
    }

    if (!photoUrl || typeof photoUrl !== "string") {
      throw new AppError(400, "Valid photoUrl is required.");
    }

    if (!verificationToken || typeof verificationToken !== "string") {
      throw new AppError(
        400,
        "Phone number not verified. verificationToken missing or invalid."
      );
    }

    // 2️⃣ Decode / verify token → { isVerified, phone }
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

    const normalizedPhone = phone.trim(); // assume token already stores normalized phone

    // 3️⃣ Main transactional logic
    const profile = await prisma.$transaction(async (tx) => {
      // 3.1 Load customer
      const existingCustomer = await tx.customer.findUnique({
        where: { id: customerId },
        select: {
          isProfileComplete: true,
          fullName: true,
          email: true,
        },
      });

      if (!existingCustomer) {
        throw new AppError(404, "Customer not found.");
      }

      if (existingCustomer.isProfileComplete) {
        throw new AppError(409, "Profile already completed.");
      }

      // 3.2 Ensure phone is not already used (logical pre-check)
      const phoneExists = await tx.customerProfile.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      });

      if (phoneExists) {
        throw new AppError(409, "Phone number already in use.");
      }

      // 3.3 Create profile
      const createdProfile = await tx.customerProfile.create({
        data: {
          customerId,
          photoUrl,
          phone: normalizedPhone,
          // countryCode will default to "+91"
          address: address ?? null,
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

      // 3.4 Mark customer as active + profile complete
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
    // 4️⃣ Known application errors
    if (err instanceof AppError) {
      throw err;
    }

    // 5️⃣ Prisma known request errors (e.g. unique constraint)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation
      if (err.code === "P2002") {
        const target = (err.meta?.target ?? "") as string | string[];

        const targets = Array.isArray(target) ? target : [target];

        // Check which unique field failed (phone / customerId)
        if (targets.some((t) => t.includes("phone"))) {
          throw new AppError(409, "Phone number already in use.");
        }

        if (targets.some((t) => t.includes("customerId"))) {
          throw new AppError(409, "Customer already has a profile.");
        }

        // Fallback for other unique constraints
        throw new AppError(409, "Resource already exists.");
      }

      // Other Prisma known errors can be mapped here if needed
      throw new AppError(
        500,
        "Database error while creating customer profile."
      );
    }

    // 6️⃣ Unknown/unexpected errors – log & wrap
    // You can replace console.error with your logger
    console.error("CustomerProfileService unexpected error:", err);

    throw new AppError(
      500,
      "Customer profile creation failed. Please try again later."
    );
  }
};