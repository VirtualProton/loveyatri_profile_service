import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { env } from "../../config/env.js";
import {
  emailChangeToken,
  verifyEmailChangeToken,
} from "../../utils/generateEmailVerificationToken.js";
import jwt from "jsonwebtoken";
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

function normalizeCountryCode(
  value: string | null | undefined,
  options: { allowNull?: boolean } = {}
) {
  const { allowNull = false } = options;

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return allowNull ? null : undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return allowNull ? null : undefined;
  }

  const normalized = trimmed.startsWith("+")
    ? `+${trimmed.slice(1).replace(/\D/g, "")}`
    : `+${trimmed.replace(/\D/g, "")}`;

  if (!/^\+\d{1,4}$/.test(normalized)) {
    throw new AppError(400, "Invalid country code. It must be like +91, +1, etc.");
  }

  return normalized;
}

export const CustomerProfileUpdateService = async (data: {
  customerId: string;
  fullName?: string;
  photoUrl?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  email?: string;
  verificationToken?: string;
}) => {
  try {
    const {
      customerId,
      fullName,
      photoUrl,
      address,
      city,
      state,
      countryCode,
      email,
      verificationToken,
    } = data;

    if (!customerId) {
      throw new AppError(400, "Customer ID is required");
    }

    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { CustomerProfile: true },
      });

      if (!customer) {
        throw new AppError(404, "Customer not found");
      }

      const currentEmail = customer.email;
      const currentPhone = customer.CustomerProfile?.phone ?? null;
      const normalizedEmail = email?.trim();

      const wantsEmailChange =
        normalizedEmail !== undefined && normalizedEmail !== currentEmail;

      let wantsPhoneChange = false;
      let newPhoneFromToken: string | null = null;

      if (verificationToken) {
        const { isVerified, phone } = decodePhoneVerificationToken(
          verificationToken
        );

        if (!isVerified) {
          throw new AppError(
            400,
            "Phone number not verified. Verification required."
          );
        }

        newPhoneFromToken = phone.trim();

        if (!customer.CustomerProfile) {
          throw new AppError(
            404,
            "Customer profile not found. Please create profile first."
          );
        }

        if (!currentPhone || newPhoneFromToken !== currentPhone) {
          wantsPhoneChange = true;
        }
      }

      if (wantsEmailChange && wantsPhoneChange) {
        throw new AppError(
          400,
          "You can update either email or phone at a time, not both."
        );
      }

      const customerUpdateData: Record<string, unknown> = {};
      const profileUpdateData: Record<string, unknown> = {};

      if (fullName !== undefined) {
        customerUpdateData.fullName = fullName;
      }

      if (photoUrl !== undefined) {
        const normalizedPhotoUrl = photoUrl.trim();

        if (!normalizedPhotoUrl) {
          throw new AppError(400, "photoUrl cannot be empty");
        }

        profileUpdateData.photoUrl = normalizedPhotoUrl;
      }

      if (address !== undefined) {
        profileUpdateData.address = normalizeNullableText(address);
      }

      if (city !== undefined) {
        profileUpdateData.city = normalizeNullableText(city);
      }

      if (state !== undefined) {
        profileUpdateData.state = normalizeNullableText(state);
      }

      if (countryCode !== undefined) {
        profileUpdateData.countryCode = normalizeCountryCode(countryCode, {
          allowNull: true,
        });
      }

      let phoneChanged = false;

      if (wantsPhoneChange && newPhoneFromToken) {
        const phoneExists = await tx.customerProfile.findFirst({
          where: {
            phone: newPhoneFromToken,
            NOT: { customerId },
          },
          select: { id: true },
        });

        if (phoneExists) {
          throw new AppError(
            409,
            "Phone number already in use by another customer"
          );
        }

        profileUpdateData.phone = newPhoneFromToken;
        phoneChanged = true;
      }

      let emailChangeLink: string | null = null;

      if (wantsEmailChange) {
        if (!normalizedEmail) {
          throw new AppError(400, "Email is required");
        }

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
          throw new AppError(400, "Invalid email format");
        }

        const emailExistsInCustomer = await tx.customer.findFirst({
          where: {
            OR: [
              { email: normalizedEmail },
              { pendingEmail: normalizedEmail },
            ],
            NOT: { id: customerId },
          },
          select: { id: true },
        });

        if (emailExistsInCustomer) {
          throw new AppError(
            409,
            "Email already in use by another customer"
          );
        }

        if (!customer.isActive) {
          throw new AppError(
            403,
            "Cannot update email. Account must be active to change email address"
          );
        }

        const updatedForVersion = await tx.customer.update({
          where: { id: customerId },
          data: {
            emailVerifyVersion: {
              increment: 1,
            },
          },
          select: {
            id: true,
            email: true,
            emailVerifyVersion: true,
          },
        });

        const token = emailChangeToken({
          customerId,
          newEmail: normalizedEmail,
          oldEmail: updatedForVersion.email,
          version: updatedForVersion.emailVerifyVersion,
        });

        emailChangeLink = `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(
          token
        )}`;
      }

      const hasCustomerChanges = Object.keys(customerUpdateData).length > 0;
      const hasProfileChanges = Object.keys(profileUpdateData).length > 0;

      if (
        !hasCustomerChanges &&
        !hasProfileChanges &&
        !wantsEmailChange &&
        !wantsPhoneChange
      ) {
        throw new AppError(400, "No changes provided to update");
      }

      if (hasCustomerChanges) {
        await tx.customer.update({
          where: { id: customerId },
          data: customerUpdateData,
        });
      }

      if (hasProfileChanges) {
        if (!customer.CustomerProfile) {
          throw new AppError(
            404,
            "Customer profile not found. Please create profile first."
          );
        }

        await tx.customerProfile.update({
          where: { customerId },
          data: profileUpdateData,
        });
      }

      const updatedCustomer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { CustomerProfile: true },
      });

      if (!updatedCustomer) {
        throw new AppError(
          500,
          "Customer disappeared during update. Please try again"
        );
      }

      return {
        customer: updatedCustomer,
        emailChangeLink,
        phoneChanged,
      };
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = (err.meta?.target ?? []) as string[] | string;
        const targets = Array.isArray(target) ? target : [target];

        if (targets.some((t) => t.toLowerCase().includes("phone"))) {
          throw new AppError(409, "Phone number already in use");
        }

        if (targets.some((t) => t.toLowerCase().includes("email"))) {
          throw new AppError(409, "Email already in use");
        }

        throw new AppError(409, "Unique constraint violation");
      }

      throw new AppError(
        500,
        "Database error while updating customer profile."
      );
    }

    console.error("CustomerProfileUpdateService error:", err);

    throw new AppError(
      500,
      "Customer profile update failed: " + (err?.message || "Unexpected error")
    );
  }
};

type EmailChangeTokenPayload = {
  customerId?: string;
  newEmail: string;
  oldEmail: string;
  version?: number;
};

export const VerifyCustomerEmailChangeService = async (token: string) => {
  try {
    if (!token) {
      throw new AppError(400, "Email change token is required");
    }

    let payload: any = null;

    try {
      payload = verifyEmailChangeToken(token) as EmailChangeTokenPayload;
    } catch {
      throw new AppError(
        400,
        "Invalid or expired email change token. Please request a new link"
      );
    }

    const { customerId, newEmail, oldEmail, version } = payload || {};

    if (!customerId || !newEmail || !oldEmail) {
      throw new AppError(
        400,
        "Invalid email change token payload. Please request a new link"
      );
    }

    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { CustomerProfile: true },
      });

      if (!customer) {
        throw new AppError(404, "Customer not found");
      }

      if (version == null || customer.emailVerifyVersion !== version) {
        throw new AppError(
          400,
          "This email change link is no longer valid. Please request a new link"
        );
      }

      if (customer.email !== oldEmail) {
        throw new AppError(
          400,
          "Email has already been changed or does not match the email change link"
        );
      }

      const emailExistsInCustomer = await tx.customer.findFirst({
        where: {
          OR: [{ email: newEmail }, { pendingEmail: newEmail }],
          NOT: { id: customerId },
        },
        select: { id: true },
      });

      if (emailExistsInCustomer) {
        throw new AppError(
          409,
          "Email already in use by another customer. Please use a different email"
        );
      }

      await tx.customer.update({
        where: { id: customerId },
        data: {
          email: newEmail,
          pendingEmail: null,
          emailVerifyVersion: {
            increment: 1,
          },
        },
      });

      const finalCustomer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { CustomerProfile: true },
      });

      if (!finalCustomer) {
        throw new AppError(
          500,
          "Customer disappeared during email verification. Please try again"
        );
      }

      return {
        customer: finalCustomer,
        emailChanged: true,
      };
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err?.code === "P2002") {
      throw new AppError(409, "Email already in use");
    }

    console.error("VerifyCustomerEmailChangeService error:", err);

    throw new AppError(
      500,
      "Failed to verify email change: " + (err?.message || "Unexpected error")
    );
  }
};
