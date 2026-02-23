import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { env } from "../../config/env.js";
import { emailChangeToken } from "../../utils/generateEmailVerificationToken.js";
// import { sendCustomerPhoneChangeOtp } from "../../utils/otp.js"; // TODO: plug your OTP sender

import jwt from "jsonwebtoken";
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

export const CustomerProfileUpdateService = async (data: {
  customerId: string;
  fullName?: string;
  photoUrl?: string;
  address?: string | null;
  email?: string;
  verificationToken?: string; // optional – used only when changing phone
}) => {
  try {
    const { customerId, fullName, photoUrl, address, email, verificationToken } =
      data;

    if (!customerId) {
      throw new AppError(400, "Customer ID is required");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Get current customer and profile
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { CustomerProfile: true },
      });

      if (!customer) {
        throw new AppError(404, "Customer not found");
      }

      const currentEmail = customer.email;
      const currentPhone = customer.CustomerProfile?.phone ?? null;

      // 2. Decide what is actually changing

      // Email change: only if email is provided and different
      const wantsEmailChange =
        email !== undefined && email !== currentEmail;

      // Phone change: via verificationToken
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

        // Only consider it a change if different from current
        if (!currentPhone || newPhoneFromToken !== currentPhone) {
          wantsPhoneChange = true;
        }
      }

      // 3. Disallow changing email and phone together
      if (wantsEmailChange && wantsPhoneChange) {
        throw new AppError(
          400,
          "You can update either email or phone at a time, not both."
        );
      }

      const customerUpdateData: Record<string, any> = {};
      const profileUpdateData: Record<string, any> = {};

      // 4. fullName → Customer + CustomerProfile
      if (fullName !== undefined) {
        customerUpdateData.fullName = fullName;
        profileUpdateData.fullName = fullName;
      }

      // 5. photoUrl → profile
      if (photoUrl !== undefined) {
        profileUpdateData.photoUrl = photoUrl;
      }

      // 6. address → profile
      if (address !== undefined) {
        profileUpdateData.address = address;
      }

      // 7. Handle PHONE change (no OTP send here; token already verified)
      let phoneChanged = false;

      if (wantsPhoneChange && newPhoneFromToken) {
        // Check phone uniqueness across other profiles
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

      // 8. Handle EMAIL change with versioned token
      let emailChangeLink: string | null = null;

      if (wantsEmailChange) {
        if (!email) {
          throw new AppError(400, "Email is required");
        }

        // Check uniqueness in Customer.email / Customer.pendingEmail
        const emailExistsInCustomer = await tx.customer.findFirst({
          where: {
            OR: [{ email }, { pendingEmail: email }],
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

        // Only active accounts can change email
        if (!customer.isActive) {
          throw new AppError(
            403,
            "Cannot update email. Account must be active to change email address"
          );
        }

        // Bump version atomically
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
          newEmail: email,
          oldEmail: updatedForVersion.email,
          version: updatedForVersion.emailVerifyVersion,
        });

        emailChangeLink = `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(
          token
        )}`;

        // NOTE:
        // - We are NOT updating Customer.email here.
        // - Your verify-email-change endpoint should:
        //   - validate token + version
        //   - update Customer.email (and maybe Customer.pendingEmail).
      }

      // 9. If nothing is changing at all, bail out early
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

      // 10. Apply updates

      if (hasCustomerChanges) {
        await tx.customer.update({
          where: { id: customerId },
          data: customerUpdateData,
        });
      }

      if (hasProfileChanges) {
        if (customer.CustomerProfile) {
          await tx.customerProfile.update({
            where: { customerId },
            data: profileUpdateData,
          });
        } else {
          throw new AppError(
            404,
            "Customer profile not found. Please create profile first."
          );
        }
      }

      // 11. Fetch updated customer with profile
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
        emailChangeLink, // null if email not changed
        phoneChanged,    // true if phone changed via verificationToken
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
  customerId: string;
  newEmail: string;
  oldEmail: string;
  version?: number;
};

export const VerifyCustomerEmailChangeService = async (token: string) => {
  try {
    if (!token) {
      throw new AppError(400, "Email change token is required");
    }

    let payload:any = null;

    // 1. Decode & validate token
    try {
      payload = emailChangeToken(token);
    } catch (err: any) {
      // Map JWT errors to a clean AppError
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
      // 2. Load customer + profile
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { CustomerProfile: true },
      });

      if (!customer) {
        throw new AppError(404, "Customer not found");
      }

      // 3. Check version to make token single-use + invalidate old ones
      if (version == null || customer.emailVerifyVersion !== version) {
        throw new AppError(
          400,
          "This email change link is no longer valid. Please request a new link"
        );
      }

      // 4. Optional: sanity check that DB still has the same old email
      if (customer.email !== oldEmail) {
        throw new AppError(
          400,
          "Email has already been changed or does not match the email change link"
        );
      }

      // 5. Extra safety: ensure newEmail not used (race-condition protection)
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

      // 6. Apply new email + bump version again => token becomes invalid
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          email: newEmail,
          pendingEmail: null,
          emailVerifyVersion: {
            increment: 1, // 🔑 makes this token (and any previous ones) invalid
          },
        },
        include: { CustomerProfile: true },
      });


      // Re-fetch to return fully consistent data
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

    // Prisma unique constraint (just in case)
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

