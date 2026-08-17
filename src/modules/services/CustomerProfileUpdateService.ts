import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import {
  buildEmailChangeLink,
  emailChangeToken,
  verifyEmailChangeToken,
} from "../../utils/generateEmailVerificationToken.js";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import jwt from "jsonwebtoken";

const PHONE_VERIFICATION_SECRET = env.JWT_SECRET;

type PhoneVerificationTokenPayload = {
  isVerified: boolean;
  phone: string;
};

function verifyPhoneVerificationToken(
  token: string
): PhoneVerificationTokenPayload {
  if (!PHONE_VERIFICATION_SECRET) {
    throw new AppError(
      500,
      "Phone verification is temporarily unavailable. Please try again later."
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      PHONE_VERIFICATION_SECRET
    ) as PhoneVerificationTokenPayload | null;

    if (!decoded || typeof decoded !== "object") {
      throw new AppError(
        400,
        "Phone number is not verified - Please verify first before update."
      );
    }

    const { phone, isVerified } = decoded;

    if (!phone || !isVerified) {
      throw new AppError(
        400,
        "Phone number is not verified - Please verify first before update."
      );
    }

    return { phone, isVerified };
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err?.name === "TokenExpiredError") {
      throw new AppError(
        400,
        "Phone verification token has expired. Please verify your phone again."
      );
    }

    throw new AppError(
      400,
      "Invalid phone verification token. Please verify your phone again."
    );
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

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    throw new AppError(400, "Email is required");
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new AppError(400, "Invalid email format");
  }

  return normalized;
}

function normalizeCountryCode(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  let normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (!normalized.startsWith("+")) {
    normalized = "+" + normalized.replace(/\D/g, "");
  } else {
    normalized = "+" + normalized.slice(1).replace(/\D/g, "");
  }

  if (!/^\+\d{1,4}$/.test(normalized)) {
    throw new AppError(400, "Invalid country code. It must be like +91, +1, etc.");
  }

  return normalized;
}

export const CustomerProfileUpdateService = async (data: {
  customerId: string;
  fullName?: string | null;
  photoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  email?: string | null;
  countryCode?: string | null;
  verificationToken?: string | null;
  phoneVerificationToken?: string | null;
}) => {
  try {
    const {
      customerId,
      fullName,
      photoUrl,
      address,
      city,
      state,
      email,
      countryCode,
      verificationToken,
      phoneVerificationToken,
    } = data;

    if (!customerId) {
      throw new AppError(400, "Customer ID is required");
    }

    if (verificationToken && phoneVerificationToken) {
      throw new AppError(
        400,
        "Use either verificationToken or phoneVerificationToken, not both"
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

      const currentProfileEmail = customer.CustomerProfile?.email ?? null;
      const normalizedEmail =
        email !== undefined && email !== null ? normalizeEmail(email) : undefined;
      const wantsEmailChange =
        normalizedEmail !== undefined &&
        normalizedEmail !== currentProfileEmail;
      const phoneToken = verificationToken ?? phoneVerificationToken ?? null;
      const currentPhone = customer.phone ?? null;
      let decodedPhone: string | null = null;
      let wantsPhoneChange = false;

      if (phoneToken) {
        const tokenPayload = verifyPhoneVerificationToken(phoneToken);
        const normalizedPhone = String(tokenPayload.phone || "").replace(/\D/g, "");

        if (!normalizedPhone || normalizedPhone.length < 7) {
          throw new AppError(
            400,
            "Invalid phone number in verification token. Please re-verify your phone."
          );
        }

        decodedPhone = normalizedPhone;
        wantsPhoneChange = decodedPhone !== currentPhone;
      }

      const customerUpdateData: Record<string, unknown> = {};
      const profileUpdateData: Record<string, unknown> = {};

      if (fullName !== undefined && fullName !== null) {
        const normalizedFullName = fullName.trim();

        if (!normalizedFullName) {
          throw new AppError(400, "fullName cannot be empty");
        }

        customerUpdateData.fullName = normalizedFullName;
      }

      if (photoUrl !== undefined) {
        profileUpdateData.photoUrl =
          typeof photoUrl === "string" ? photoUrl.trim() || null : null;
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

      const normalizedCountryCode = normalizeCountryCode(countryCode);

      if (normalizedCountryCode) {
        customerUpdateData.countryCode = normalizedCountryCode;
      }

      let emailChangeLink: string | null = null;
      let phoneChanged = false;

      if (wantsEmailChange && normalizedEmail) {
        if (!customer.CustomerProfile || !currentProfileEmail) {
          throw new AppError(
            404,
            "Customer profile not found. Please create profile first."
          );
        }

        if (!customer.isActive) {
          throw new AppError(
            403,
            "Cannot update email. Account must be active to change email address"
          );
        }

        const emailExistsInProfile = await tx.customerProfile.findFirst({
          where: {
            email: normalizedEmail,
            NOT: { customerId },
          },
          select: { id: true },
        });

        if (emailExistsInProfile) {
          throw new AppError(409, "Email already in use by another customer");
        }

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
          oldEmail: currentProfileEmail,
          version: updatedForVersion.emailVerifyVersion,
        });

        emailChangeLink = buildEmailChangeLink(token);
      }

      if (wantsPhoneChange) {
        if (!decodedPhone) {
          throw new AppError(
            400,
            "Phone number is not verified - Please verify first before update."
          );
        }

        const phoneExists = await tx.customer.findFirst({
          where: {
            phone: decodedPhone,
            NOT: { id: customerId },
          },
          select: { id: true },
        });

        if (phoneExists) {
          throw new AppError(
            409,
            "Phone number already in use by another customer"
          );
        }

        customerUpdateData.phone = decodedPhone;
        phoneChanged = true;
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

    let payload: EmailChangeTokenPayload;

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

      if (!customer.CustomerProfile) {
        throw new AppError(404, "Customer profile not found");
      }

      if (version == null || customer.CustomerProfile.emailVerifyVersion !== version) {
        throw new AppError(
          400,
          "This email change link is no longer valid. Please request a new link"
        );
      }

      if (customer.CustomerProfile.email !== oldEmail) {
        throw new AppError(
          400,
          "Email has already been changed or does not match the email change link"
        );
      }

      const emailExistsInProfile = await tx.customerProfile.findFirst({
        where: {
          email: newEmail,
          NOT: { customerId },
        },
        select: { id: true },
      });

      if (emailExistsInProfile) {
        throw new AppError(
          409,
          "Email already in use by another customer. Please use a different email"
        );
      }

      await tx.customerProfile.update({
        where: { customerId },
        data: {
          email: newEmail,
          emailVerifyVersion: {
            increment: 1,
          },
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          isActive: true,
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
