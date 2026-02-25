import { env } from "../../config/env.js";
import { PreferredLanguage, Prisma } from "../../generated/prisma/client.js";
// import { OwnerProfileUpdateRequest } from "../../types.js";
import { AppError } from "../../utils/appError.js";
import { emailChangeToken } from "../../utils/generateEmailVerificationToken.js";
import { prisma } from "../../utils/prisma.js";
import jwt from "jsonwebtoken";

const PHONE_VERIFICATION_SECRET = env.JWT_SECRET; // You can use a separate secret if you want, but for simplicity we're using the same env variable here

type PhoneVerificationTokenPayload = {
    isVerified: boolean;
    phone: string; // normalized phone with country code, e.g. "919876543210"
};

/**
 * 🔐 Verify Phone Verification Token
 * - Ensures env secret exists
 * - Validates JWT
 * - Ensures payload contains verified phone
 */
function verifyPhoneVerificationToken(
    token: string
): PhoneVerificationTokenPayload {
    if (!PHONE_VERIFICATION_SECRET) {
        // Misconfiguration on server – don't leak details to client
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
        // JWT library errors
        if (err instanceof AppError) {
            // Already a clean AppError from above
            throw err;
        }

        if (err.name === "TokenExpiredError") {
            throw new AppError(
                401,
                "Phone verification token has expired. Please verify your phone again."
            );
        }

        if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
            throw new AppError(
                400,
                "Phone number is not verified - Please verify first before update."
            );
        }

        // Fallback for any other unexpected error during verification
        throw new AppError(
            400,
            "Phone number is not verified - Please verify first before update."
        );
    }
}



export const OwnerProfileService = async (data: {
    adminId: string;
    photoUrl: string;
    preferredLanguage: string; // will be validated/cast to enum
    shortBio?: string | null;

    // 🔐 Phone verification token (from controller)
    phoneVerificationToken?: string;

    // 🔽 New fields from updated AdminProfile schema
    countryCode?: string | null; // optional override; if missing, let Prisma default "+91"

    // GST / billing details (optional, but validated if isGstRegistered === true)
    isGstRegistered?: boolean;
    gstNumber?: string | null;
    gstLegalName?: string | null;
    gstStateCode?: string | null;
    gstBillingAddress?: string | null;
    pincode?: string | null;
}) => {
    try {
        let {
            adminId,
            photoUrl,
            preferredLanguage,
            shortBio,
            phoneVerificationToken,
            countryCode,
            isGstRegistered,
            gstNumber,
            gstLegalName,
            gstStateCode,
            gstBillingAddress,
            pincode,
        } = data;

        // 🔹 Basic guards (defensive, even if controller/schema already validate)
        if (!adminId) {
            throw new AppError(400, "Admin ID is required.");
        }

        if (!photoUrl) {
            throw new AppError(400, "Photo URL is required.");
        }

        if (!preferredLanguage) {
            throw new AppError(400, "Preferred language is required.");
        }

        // ✅ Phone number must be verified
        if (!phoneVerificationToken) {
            throw new AppError(
                400,
                "Phone number is not verified - please verify first before completing the profile."
            );
        }

        // ✅ Decode & validate token (throws AppError on any issue)
        // Assumption: verifyPhoneVerificationToken returns { phone: string }
        const tokenPayload = verifyPhoneVerificationToken(phoneVerificationToken);
        let rawPhone = String(tokenPayload.phone || "").trim();

        if (!rawPhone) {
            throw new AppError(
                400,
                "Phone number not found in verification token. Please re-verify your phone."
            );
        }

        // 🔹 Normalize phone: digits only (including country code digits if present)
        const phone = rawPhone.replace(/\D/g, "");
        if (!phone || phone.length < 7) {
            throw new AppError(
                400,
                "Invalid phone number in verification token. Please re-verify your phone."
            );
        }

        // 🔹 Normalize basic text fields
        photoUrl = photoUrl.trim();
        preferredLanguage = preferredLanguage.trim() as string;

        if (shortBio !== undefined && shortBio !== null) {
            shortBio = shortBio.toString().trim() || null;
        }

        if (pincode !== undefined && pincode !== null) {
            pincode = pincode.toString().trim() || null;
        }

        // 🔹 Normalize & validate countryCode (optional)
        let normalizedCountryCode: string | undefined;
        if (countryCode !== undefined && countryCode !== null) {
            let cc = String(countryCode).trim();
            if (cc) {
                if (!cc.startsWith("+")) {
                    cc = "+" + cc.replace(/\D/g, "");
                } else {
                    cc = "+" + cc.slice(1).replace(/\D/g, "");
                }

                if (!/^\+\d{1,4}$/.test(cc)) {
                    throw new AppError(
                        400,
                        "Invalid country code. It must be like +91, +1, etc."
                    );
                }

                normalizedCountryCode = cc;
            }
            // if empty string after trim → ignore and let default apply
        }

        // 🔹 Normalize boolean flags
        isGstRegistered = Boolean(isGstRegistered);

        // 🔹 GST-related validation
        let finalGstNumber: string | null = null;
        let finalGstLegalName: string | null = null;
        let finalGstStateCode: string | null = null;
        let finalGstBillingAddress: string | null = null;

        if (isGstRegistered) {
            finalGstNumber = (gstNumber ?? "").toString().trim() || null;
            finalGstLegalName = (gstLegalName ?? "").toString().trim() || null;
            finalGstStateCode = (gstStateCode ?? "").toString().trim() || null;
            finalGstBillingAddress =
                (gstBillingAddress ?? "").toString().trim() || null;

            // Required fields if GST-registered
            if (!finalGstNumber) {
                throw new AppError(
                    400,
                    "GST number is required when GST registration is enabled."
                );
            }
            if (!finalGstLegalName) {
                throw new AppError(
                    400,
                    "GST legal name is required when GST registration is enabled."
                );
            }
            if (!finalGstStateCode) {
                throw new AppError(
                    400,
                    "GST state code is required when GST registration is enabled."
                );
            }

            // Basic format validations
            if (finalGstNumber.length !== 15) {
                throw new AppError(
                    400,
                    "GST number must be exactly 15 characters as per GSTIN format."
                );
            }

            if (!/^[0-9]{2}$/.test(finalGstStateCode)) {
                throw new AppError(
                    400,
                    "GST state code must be a 2-digit numeric code."
                );
            }
        } else {
            finalGstNumber = null;
            finalGstLegalName = null;
            finalGstStateCode = null;
            finalGstBillingAddress = null;
        }

        // 🔹 Basic pincode validation (if provided)
        if (pincode) {
            const normalizedPincode = pincode.replace(/\s+/g, "");
            if (!/^\d{4,10}$/.test(normalizedPincode)) {
                throw new AppError(
                    400,
                    "Pincode must be between 4 and 10 digits if provided."
                );
            }
            pincode = normalizedPincode;
        }

        // 🔹 Validate preferredLanguage against enum if available
        // (Assumes PreferredLanguage is a Prisma enum; adjust import as needed)
        try {
            const allowedLanguages = Object.values(PreferredLanguage || {});
            if (
                Array.isArray(allowedLanguages) &&
                allowedLanguages.length > 0 &&
                !allowedLanguages.includes(preferredLanguage as any)
            ) {
                throw new AppError(
                    400,
                    `Invalid preferred language. Allowed values: ${allowedLanguages.join(
                        ", "
                    )}`
                );
            }
        } catch {
            // If enum not available for some reason, we silently skip strict validation
        }

        // ✅ Main transactional logic
        return await prisma.$transaction(async (tx) => {
            // Ensure owner/admin exists
            const existingOwner = await tx.admin.findUnique({
                where: { id: adminId },
                select: {
                    isProfileComplete: true,
                    isActive: true,
                },
            });

            if (!existingOwner) {
                throw new AppError(404, "Owner not found.");
            }

            if (existingOwner.isProfileComplete) {
                throw new AppError(409, "Profile is already completed.");
            }

            // Ensure there is no existing profile row for this adminId
            const existingProfileForAdmin = await tx.adminProfile.findUnique({
                where: { adminId },
                select: { id: true },
            });

            if (existingProfileForAdmin) {
                throw new AppError(
                    409,
                    "Profile already exists for this owner. Please edit the existing profile."
                );
            }

            // ✅ Ensure phone not already used (app-level check)
            const phoneExists = await tx.adminProfile.findFirst({
                where: { phone },
                select: { id: true },
            });

            if (phoneExists) {
                throw new AppError(409, "Phone number is already in use.");
            }

            // ✅ Optional GST uniqueness check for nicer error than raw P2002
            if (finalGstNumber) {
                const gstExists = await tx.adminProfile.findFirst({
                    where: { gstNumber: finalGstNumber },
                    select: { id: true },
                });

                if (gstExists) {
                    throw new AppError(
                        409,
                        "GST number is already linked to another profile."
                    );
                }
            }

            // Create profile
            const profile = await tx.adminProfile.create({
                data: {
                    adminId,
                    phone,
                    photoUrl,
                    preferredLanguage: preferredLanguage as any,
                    shortBio: shortBio ?? null,

                    // countryCode is fully optional; if undefined, Prisma will apply default "+91"
                    ...(normalizedCountryCode
                        ? { countryCode: normalizedCountryCode }
                        : {}),

                    isGstRegistered: isGstRegistered ?? false,
                    gstNumber: finalGstNumber,
                    gstLegalName: finalGstLegalName,
                    gstStateCode: finalGstStateCode,
                    gstBillingAddress: finalGstBillingAddress,
                    pincode: pincode ?? null,
                },
                include: {
                    admin: {
                        select: { fullName: true, email: true },
                    },
                },
            });

            // Mark admin as active + profile complete
            await tx.admin.update({
                where: { id: adminId },
                data: {
                    isProfileComplete: true,
                    isActive: true,
                },
            });

            return profile;
        });
    } catch (err: any) {
        // Let known AppErrors bubble up
        if (err instanceof AppError) {
            throw err;
        }

        // Handle known Prisma errors
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            // Unique constraint failed
            if (err.code === "P2002") {
                const target = Array.isArray(err.meta?.target)
                    ? (err.meta?.target as string[]).join(",")
                    : String(err.meta?.target ?? "");

                if (target.includes("phone")) {
                    throw new AppError(409, "Phone number is already in use.");
                }

                if (target.includes("adminId")) {
                    throw new AppError(
                        409,
                        "Profile already exists for this owner. Please edit the existing profile."
                    );
                }

                if (target.includes("gstNumber")) {
                    throw new AppError(
                        409,
                        "GST number is already linked to another profile."
                    );
                }

                // Generic unique constraint fallback
                throw new AppError(
                    409,
                    "Duplicate value for a unique field. Please check your inputs."
                );
            }

            // Foreign key constraint failed (defensive)
            if (err.code === "P2003") {
                throw new AppError(
                    400,
                    "Invalid reference detected (possibly invalid adminId)."
                );
            }

            // Record not found (defensive)
            if (err.code === "P2025") {
                throw new AppError(404, "Related record not found.");
            }

            // Generic DB error
            throw new AppError(
                500,
                "Database error while creating owner profile."
            );
        }

        // Fallback: unknown/unexpected error
        throw new AppError(
            500,
            "Owner profile creation failed: " + (err?.message || "Unknown error")
        );
    }
};


type OwnerProfileUpdateData = {
  adminId: string;
  fullName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  preferredLanguage?: string | null;
  shortBio?: string | null;

  // 🔐 Phone verification token (from OTP verification step)
  phoneVerificationToken?: string | null;

  // AdminProfile extras
  countryCode?: string | null;      // non-optional in DB; null -> do NOT update
  isGstRegistered?: boolean | null; // non-optional in DB; null -> do NOT update

  // Optional columns in Prisma: user can send null to clear
  gstNumber?: string | null;
  gstLegalName?: string | null;
  gstStateCode?: string | null;
  gstBillingAddress?: string | null;
  pincode?: string | null;
};

export const UpdateOwnerProfileService = async (
  data: OwnerProfileUpdateData
) => {
  try {
    let {
      adminId,
      fullName,
      email,
      photoUrl,
      preferredLanguage,
      shortBio,
      phoneVerificationToken,

      countryCode,
      isGstRegistered,
      gstNumber,
      gstLegalName,
      gstStateCode,
      gstBillingAddress,
      pincode,
    } = data;

    if (!adminId) {
      throw new AppError(400, "Owner ID is required");
    }

    adminId = adminId.trim();

    return await prisma.$transaction(async (tx) => {
      // 1. Load current admin + profile
      const admin = await tx.admin.findUnique({
        where: { id: adminId },
        include: { profile: true },
      });

      if (!admin) {
        throw new AppError(404, "Owner not found");
      }

      const profile = admin.profile;
      if (!profile) {
        throw new AppError(
          404,
          "Owner profile not found. Please create profile first."
        );
      }

      const currentEmail = admin.email;
      const currentPhone = profile.phone ?? null;

      // 2. Decide changes: email & phone

      // Email change
      const wantsEmailChange =
        email !== undefined &&
        email !== null &&
        email.trim() !== "" &&
        email.trim() !== currentEmail;

      // Phone change via token
      let decodedPhone: string | null = null;
      let wantsPhoneChange = false;

      if (phoneVerificationToken) {
        const tokenPayload = verifyPhoneVerificationToken(
          phoneVerificationToken
        );

        let rawPhone = String(tokenPayload.phone || "").trim();

        if (!rawPhone) {
          throw new AppError(
            400,
            "Phone number not found in verification token. Please re-verify your phone."
          );
        }

        const normalizedPhone = rawPhone.replace(/\D/g, "");
        if (!normalizedPhone || normalizedPhone.length < 7) {
          throw new AppError(
            400,
            "Invalid phone number in verification token. Please re-verify your phone."
          );
        }

        decodedPhone = normalizedPhone;
        wantsPhoneChange = decodedPhone !== currentPhone;
      }

      // 3. Disallow changing email and phone together
      if (wantsEmailChange && wantsPhoneChange) {
        throw new AppError(
          400,
          "You can update either email or phone at a time, not both"
        );
      }

      const adminUpdateData: Record<string, any> = {};
      const adminProfileUpdateData: Record<string, any> = {};

      // 4. fullName → Admin (non-optional field in DB)
      if (fullName !== undefined && fullName !== null) {
        const trimmed = fullName.trim();
        if (!trimmed) {
          throw new AppError(400, "Full name cannot be empty");
        }
        adminUpdateData.fullName = trimmed;
      }

      // 5. profile fields → AdminProfile

      // photoUrl (non-optional)
      if (photoUrl !== undefined && photoUrl !== null) {
        const trimmed = photoUrl.trim();
        if (!trimmed) {
          throw new AppError(400, "Photo URL cannot be empty");
        }
        adminProfileUpdateData.photoUrl = trimmed;
      }

      // preferredLanguage (non-optional)
      if (preferredLanguage !== undefined && preferredLanguage !== null) {
        const trimmed = preferredLanguage.trim();

        // Optional: validate enum
        try {
          const allowedLanguages = Object.values(PreferredLanguage || {});
          if (
            Array.isArray(allowedLanguages) &&
            allowedLanguages.length > 0 &&
            !allowedLanguages.includes(trimmed as any)
          ) {
            throw new AppError(
              400,
              `Invalid preferred language. Allowed values: ${allowedLanguages.join(
                ", "
              )}`
            );
          }
        } catch {
          // swallow if enum not available for some reason
        }

        adminProfileUpdateData.preferredLanguage = trimmed;
      }

      // shortBio (optional column → null allowed)
      if (shortBio !== undefined) {
        if (shortBio === null) {
          adminProfileUpdateData.shortBio = null;
        } else {
          const trimmed = shortBio.toString().trim();
          adminProfileUpdateData.shortBio = trimmed || null;
        }
      }

      // 6. PHONE change via token
      let phoneChanged = false;

      if (wantsPhoneChange) {
        if (!decodedPhone) {
          throw new AppError(
            400,
            "Phone number is not verified - Please verify first before update."
          );
        }

        const newPhone = decodedPhone;

        // Check phone uniqueness (other admins only)
        const phoneExists = await tx.adminProfile.findFirst({
          where: {
            phone: newPhone,
            NOT: { adminId },
          },
          select: { id: true },
        });

        if (phoneExists) {
          throw new AppError(
            409,
            "Phone number already in use by another owner"
          );
        }

        adminProfileUpdateData.phone = newPhone;
        phoneChanged = true;
      }

      // 6.1 Country code (non-optional column → null means skip update)
      if (countryCode !== undefined && countryCode !== null) {
        let cc = countryCode.trim();
        if (cc) {
          if (!cc.startsWith("+")) {
            cc = "+" + cc.replace(/\D/g, "");
          } else {
            cc = "+" + cc.slice(1).replace(/\D/g, "");
          }

          if (!/^\+\d{1,4}$/.test(cc)) {
            throw new AppError(
              400,
              "Invalid country code. It must be like +91, +1, etc."
            );
          }

          adminProfileUpdateData.countryCode = cc;
        }
        // if cc is empty string, ignore (don't override)
      }

      // 7. GST & billing updates

      const hasIsGstRegisteredInput =
        isGstRegistered !== undefined && isGstRegistered !== null;

      // Start with current DB values
      let finalIsGstRegistered = profile.isGstRegistered;
      let finalGstNumber = profile.gstNumber;
      let finalGstLegalName = profile.gstLegalName;
      let finalGstStateCode = profile.gstStateCode;
      let finalGstBillingAddress = profile.gstBillingAddress;
      let finalPincode = profile.pincode;

      // isGstRegistered is non-optional → null means "don't touch"
      if (hasIsGstRegisteredInput) {
        finalIsGstRegistered = Boolean(isGstRegistered);
      }

      // For optional fields: undefined = no change, null = clear, string = update

      if (gstNumber !== undefined) {
        if (gstNumber === null) {
          finalGstNumber = null;
        } else {
          finalGstNumber = gstNumber.toString().trim() || null;
        }
      }

      if (gstLegalName !== undefined) {
        if (gstLegalName === null) {
          finalGstLegalName = null;
        } else {
          finalGstLegalName = gstLegalName.toString().trim() || null;
        }
      }

      if (gstStateCode !== undefined) {
        if (gstStateCode === null) {
          finalGstStateCode = null;
        } else {
          finalGstStateCode = gstStateCode.toString().trim() || null;
        }
      }

      if (gstBillingAddress !== undefined) {
        if (gstBillingAddress === null) {
          finalGstBillingAddress = null;
        } else {
          finalGstBillingAddress =
            gstBillingAddress.toString().trim() || null;
        }
      }

      if (pincode !== undefined) {
        if (pincode === null) {
          finalPincode = null;
        } else {
          const raw = pincode.toString().trim();
          if (raw) {
            const normalizedPincode = raw.replace(/\s+/g, "");
            if (!/^\d{4,10}$/.test(normalizedPincode)) {
              throw new AppError(
                400,
                "Pincode must be between 4 and 10 digits if provided."
              );
            }
            finalPincode = normalizedPincode;
          } else {
            finalPincode = null;
          }
        }
      }

      // Validate GST if finalIsGstRegistered turned on
      if (finalIsGstRegistered) {
        if (!finalGstNumber) {
          throw new AppError(
            400,
            "GST number is required when GST registration is enabled."
          );
        }
        if (!finalGstLegalName) {
          throw new AppError(
            400,
            "GST legal name is required when GST registration is enabled."
          );
        }
        if (!finalGstStateCode) {
          throw new AppError(
            400,
            "GST state code is required when GST registration is enabled."
          );
        }

        if (finalGstNumber.length !== 15) {
          throw new AppError(
            400,
            "GST number must be exactly 15 characters as per GSTIN format."
          );
        }

        if (!/^[0-9]{2}$/.test(finalGstStateCode)) {
          throw new AppError(
            400,
            "GST state code must be a 2-digit numeric code."
          );
        }
      } else if (hasIsGstRegisteredInput && !finalIsGstRegistered) {
        // If explicitly disabling GST, clear dependent fields
        finalGstNumber = null;
        finalGstLegalName = null;
        finalGstStateCode = null;
        finalGstBillingAddress = null;
      }

      // Determine if any GST-related input was provided at all
      const gstTouched =
        hasIsGstRegisteredInput ||
        gstNumber !== undefined ||
        gstLegalName !== undefined ||
        gstStateCode !== undefined ||
        gstBillingAddress !== undefined ||
        pincode !== undefined;

      if (gstTouched) {
        adminProfileUpdateData.isGstRegistered = finalIsGstRegistered;
        adminProfileUpdateData.gstNumber = finalGstNumber;
        adminProfileUpdateData.gstLegalName = finalGstLegalName;
        adminProfileUpdateData.gstStateCode = finalGstStateCode;
        adminProfileUpdateData.gstBillingAddress = finalGstBillingAddress;
        adminProfileUpdateData.pincode = finalPincode;
      }

      // 8. EMAIL change with token versioning (no direct email update yet)
      let emailChangeLink: string | null = null;

      if (wantsEmailChange) {
        if (!email) {
          throw new AppError(400, "Email is required");
        }

        const trimmedEmail = email.trim();

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
          throw new AppError(400, "Invalid email format");
        }

        // Check if email already used by another admin
        const emailExists = await tx.admin.findFirst({
          where: {
            email: trimmedEmail,
            NOT: { id: adminId },
          },
          select: { id: true },
        });

        if (emailExists) {
          throw new AppError(409, "Email already in use");
        }

        if (!admin.isActive) {
          throw new AppError(
            403,
            "Cannot update email. Account must be active to change email address"
          );
        }

        const updatedForVersion = await tx.admin.update({
          where: { id: adminId },
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
          ownerId: adminId,
          newEmail: trimmedEmail,
          oldEmail: updatedForVersion.email,
          version: updatedForVersion.emailVerifyVersion,
        });

        emailChangeLink = `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(
          token
        )}`;
      }

      // 9. If nothing at all is changing, bail out
      const hasAdminChanges = Object.keys(adminUpdateData).length > 0;
      const hasProfileChanges =
        Object.keys(adminProfileUpdateData).length > 0;

      if (
        !hasAdminChanges &&
        !hasProfileChanges &&
        !wantsEmailChange &&
        !wantsPhoneChange
      ) {
        throw new AppError(400, "No changes provided to update");
      }

      // 10. Apply updates
      if (hasAdminChanges) {
        await tx.admin.update({
          where: { id: adminId },
          data: adminUpdateData,
        });
      }

      if (hasProfileChanges) {
        await tx.adminProfile.update({
          where: { adminId },
          data: adminProfileUpdateData,
        });
      }

      // 11. Fetch updated owner with profile
      const updatedAdmin = await tx.admin.findUnique({
        where: { id: adminId },
        include: { profile: true },
      });

      if (!updatedAdmin) {
        throw new AppError(
          500,
          "Owner disappeared during update. Please try again"
        );
      }

      return {
        owner: updatedAdmin,
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
        const target = Array.isArray(err.meta?.target)
          ? (err.meta.target as string[]).join(",")
          : String(err.meta?.target ?? "");

        if (target.toLowerCase().includes("phone")) {
          throw new AppError(409, "Phone number already in use");
        }
        if (target.toLowerCase().includes("email")) {
          throw new AppError(409, "Email already in use");
        }
        if (target.toLowerCase().includes("gstNumber".toLowerCase())) {
          throw new AppError(
            409,
            "GST number is already linked to another profile"
          );
        }

        throw new AppError(409, "Unique constraint violation");
      }
    }

    console.error("UpdateOwnerProfileService error:", err);

    throw new AppError(
      500,
      "Owner profile update failed: " + (err?.message || "Unexpected error")
    );
  }
};


export const verifyEmailChangeTokenService = async (token: string) => {
    type EmailChangeTokenPayload = {
        ownerId?: string; // we used ownerId when signing
        adminId?: string; // fallback in case old tokens used adminId
        newEmail: string;
        oldEmail: string;
        version?: number;
    };
    try {
        if (!token) {
            throw new AppError(400, "Email change token is required");
        }

        let payload: EmailChangeTokenPayload;

        try {
            payload = jwt.verify(
                token, env.JWT_SECRET
            ) as EmailChangeTokenPayload;
        } catch (err: any) {
            if (err instanceof jwt.TokenExpiredError) {
                throw new AppError(401, "Token expired");
            }

            if (err instanceof jwt.JsonWebTokenError) {
                throw new AppError(401, "Invalid token");
            }

            throw new AppError(
                401,
                "Invalid or expired email change token. Please request a new link"
            );
        }

        const adminId = payload.ownerId || payload.adminId;
        const { newEmail, oldEmail, version } = payload || {};

        if (!adminId || !newEmail || !oldEmail) {
            throw new AppError(
                400,
                "Invalid email change token payload. Please request a new link"
            );
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Load owner
            const admin = await tx.admin.findUnique({
                where: { id: adminId },
                include: { profile: true },
            });

            if (!admin) {
                throw new AppError(404, "Owner not found");
            }

            // 2. Version check → single-use & invalidate old links
            if (version == null || admin.emailVerifyVersion !== version) {
                throw new AppError(
                    400,
                    "This email change link is no longer valid. Please request a new link"
                );
            }

            // 3. Sanity check: old email must still match
            if (admin.email !== oldEmail) {
                throw new AppError(
                    400,
                    "Email has already been changed or does not match the email change link"
                );
            }

            // 4. Double-check that new email isn't already used (race-condition safety)
            const emailExists = await tx.admin.findFirst({
                where: {
                    email: newEmail,
                    NOT: { id: adminId },
                },
                select: { id: true },
            });

            if (emailExists) {
                throw new AppError(
                    409,
                    "Email already in use by another owner. Please use a different email"
                );
            }

            // 5. Apply new email & bump version again → this token becomes invalid
            const updatedAdmin = await tx.admin.update({
                where: { id: adminId },
                data: {
                    email: newEmail,
                    emailVerifyVersion: {
                        increment: 1,
                    },
                },
                include: { profile: true },
            });

            // Re-fetch to be extra sure we return the latest
            const finalOwner = await tx.admin.findUnique({
                where: { id: adminId },
                include: { profile: true },
            });

            if (!finalOwner) {
                throw new AppError(
                    500,
                    "Owner disappeared during email verification. Please try again"
                );
            }

            return {
                owner: finalOwner,
                emailChanged: true,
            };
        });
    } catch (err: any) {
        if (err instanceof AppError) {
            throw err;
        }

        if (err?.code === "P2002") {
            // Prisma unique constraint – just in case
            throw new AppError(409, "Email already in use");
        }

        console.error("verifyEmailChangeTokenService error:", err);

        throw new AppError(
            500,
            "Email change verification failed: " + (err?.message || "Unexpected error")
        );
    }
}


export const getOwnerProfileService = async (adminId: string) => {
    try {
        const profile = await prisma.admin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                fullName: true,
                email: true,
                profile: true
            },
        });

        if (!profile) {
            throw new AppError(404, "Owner profile not found");
        }
        return profile;
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            500,
            "Fetching Owner profile failed" + err.message
        );
    }
}








