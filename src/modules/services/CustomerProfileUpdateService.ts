import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { env } from "../../config/env.js";
import { emailChangeToken } from "../../utils/generateEmailVerificationToken.js";
// import { sendCustomerPhoneChangeOtp } from "../../utils/otp.js"; // TODO: plug your OTP sender

export const CustomerProfileUpdateService = async (data: {
    customerId: string;
    fullName?: string;
    photoUrl?: string;
    phone?: string;
    address?: string | null;
    email?: string;
}) => {
    try {
        const {
            customerId,
            fullName,
            photoUrl,
            phone,
            address,
            email,
        } = data;

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
            const wantsEmailChange =
                email !== undefined && email !== currentEmail;
            const wantsPhoneChange =
                phone !== undefined && phone !== currentPhone;

            // 3. Disallow changing email and phone together
            if (wantsEmailChange && wantsPhoneChange) {
                throw new AppError(
                    400,
                    "You can update either email or phone at a time, not both"
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

            // 7. Handle PHONE change + OTP
            let phoneOtpSent = false;

            if (wantsPhoneChange) {
                if (!phone) {
                    throw new AppError(400, "Phone number is required");
                }

                // Check phone uniqueness (other customers)
                const phoneExists = await tx.customerProfile.findFirst({
                    where: {
                        phone,
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

                profileUpdateData.phone = phone;

                // 🔔 Send OTP to new phone (hook)
                // await sendCustomerPhoneChangeOtp({ customerId, phone });
                phoneOtpSent = true;
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

                // Check uniqueness in CustomerProfile.email
                const emailExistsInProfile = await tx.customerProfile.findFirst({
                    where: {
                        email,
                        NOT: { customerId },
                    },
                    select: { id: true },
                });

                if (emailExistsInCustomer || emailExistsInProfile) {
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

                // Bump version & get latest email (atomic)
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
                    customerId: customerId,
                    newEmail: email,
                    oldEmail: updatedForVersion.email,
                    version: updatedForVersion.emailVerifyVersion,
                });

                emailChangeLink = `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(
                    token
                )}`;

                // NOTE:
                //   We are not updating Customer.email here.
                //   Your verify-email-change endpoint should:
                //   - validate token + version
                //   - apply the new email to Customer + CustomerProfile (if needed).
            }

            // 9. If nothing is changing at all, bail out early
            const hasCustomerChanges = Object.keys(customerUpdateData).length > 0;
            const hasProfileChanges = Object.keys(profileUpdateData).length > 0;

            if (!hasCustomerChanges && !hasProfileChanges && !wantsEmailChange && !wantsPhoneChange) {
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
                    // If profile doesn't exist yet, you can also choose to create instead.
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
                // Extremely rare, but guards against weird race conditions
                throw new AppError(
                    500,
                    "Customer disappeared during update. Please try again"
                );
            }

            return {
                customer: updatedCustomer,
                emailChangeLink, // null if email not changed
                phoneOtpSent,    // true if phone changed (and OTP should have been sent)
            };
        });
    } catch (err: any) {
        // Known, intentional errors
        if (err instanceof AppError) {
            throw err;
        }

        // Handle known Prisma unique-constraint errors more nicely (optional)
        if (err?.code === "P2002") {
            // err.meta?.target often contains the unique index name
            const target = (err.meta && (err.meta.target as string[] | undefined)) || [];
            if (target.some((t:any) => t.toLowerCase().includes("phone"))) {
                throw new AppError(409, "Phone number already in use");
            }
            if (target.some((t:any) => t.toLowerCase().includes("email"))) {
                throw new AppError(409, "Email already in use");
            }

            // generic unique violation
            throw new AppError(409, "Unique constraint violation");
        }

        console.error("CustomerProfileUpdateService error:", err);

        // Fallback: unexpected server error
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

      const emailExistsInProfile = await tx.customerProfile.findFirst({
        where: {
          email: newEmail,
          NOT: { customerId },
        },
        select: { id: true },
      });

      if (emailExistsInCustomer || emailExistsInProfile) {
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

      // Optionally also sync profile.email to new email
      if (updatedCustomer.CustomerProfile) {
        await tx.customerProfile.update({
          where: { customerId },
          data: {
            email: newEmail,
          },
        });
      }

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

