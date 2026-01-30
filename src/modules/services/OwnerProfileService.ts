import { env } from "../../config/env.js";
// import { OwnerProfileUpdateRequest } from "../../types.js";
import { AppError } from "../../utils/appError.js";
import { emailChangeToken } from "../../utils/generateEmailVerificationToken.js";
import { prisma } from "../../utils/prisma.js";
import jwt from "jsonwebtoken";



export const OwnerProfileService = async (data: {
    adminId: string;
    photoUrl: string;
    phone: string;
    preferredLanguage: string;
    shortBio?: string | null;
}) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const existingOwner = await tx.admin.findUnique({
                where: { id: data.adminId },
                select: { isProfileComplete: true },
            });

            if (!existingOwner) {
                throw new AppError(404, "Owner not found");
            }

            if (existingOwner.isProfileComplete) {
                throw new AppError(409, "Profile already completed");
            }

            const phoneExists = await tx.adminProfile.findUnique({
                where: { phone: data.phone },
                select: { id: true },
            });

            if (phoneExists) {
                throw new AppError(409, "Phone number already in use");
            }

            const profile = await tx.adminProfile.create({
                data: {
                    ...data,
                    preferredLanguage: data.preferredLanguage as any
                },
                include: {
                    admin: {
                        select: { fullName: true, email: true }
                    }
                },
            });

            await tx.admin.update({
                where: { id: data.adminId },
                data: {
                    isProfileComplete: true,
                    isActive: true,
                },
            });

            return profile;
        });
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            500,
            "Owner profile creation failed" + err.message
        );
    }
};


type OwnerProfileUpdateData = {
    adminId: string;
    fullName?: string;
    email?: string;
    photoUrl?: string;
    phone?: string;
    preferredLanguage?: string;
    shortBio?: string | null;
};

export const UpdateOwnerProfileService = async (data: OwnerProfileUpdateData) => {
    try {
        const {
            adminId,
            fullName,
            email,
            photoUrl,
            phone,
            preferredLanguage,
            shortBio,
        } = data;

        if (!adminId) {
            throw new AppError(400, "Owner ID is required");
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Load current admin + profile
            const admin = await tx.admin.findUnique({
                where: { id: adminId },
                include: { profile: true },
            });

            if (!admin) {
                throw new AppError(404, "Owner not found");
            }

            const currentEmail = admin.email;
            const currentPhone = admin.profile?.phone ?? null;

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

            const adminUpdateData: Record<string, any> = {};
            const adminProfileUpdateData: Record<string, any> = {};

            // 4. fullName → Admin
            if (fullName !== undefined) {
                adminUpdateData.fullName = fullName;
            }

            // 5. profile fields → AdminProfile
            if (photoUrl !== undefined) {
                adminProfileUpdateData.photoUrl = photoUrl;
            }

            if (preferredLanguage !== undefined) {
                adminProfileUpdateData.preferredLanguage = preferredLanguage;
            }

            if (shortBio !== undefined) {
                adminProfileUpdateData.shortBio = shortBio;
            }

            // 6. PHONE change + OTP
            let phoneOtpSent = false;

            if (wantsPhoneChange) {
                if (!phone) {
                    throw new AppError(400, "Phone number is required");
                }

                // Check phone uniqueness (other admins)
                const phoneExists = await tx.adminProfile.findFirst({
                    where: {
                        phone,
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

                adminProfileUpdateData.phone = phone;

                // 🔔 Send OTP to new phone (hook)
                // await sendOwnerPhoneChangeOtp({ adminId, phone });
                phoneOtpSent = true;
            }

            // 7. EMAIL change with token versioning
            let emailChangeLink: string | null = null;

            if (wantsEmailChange) {
                if (!email) {
                    throw new AppError(400, "Email is required");
                }

                // Check if email already used by another admin
                const emailExists = await tx.admin.findFirst({
                    where: {
                        email,
                        NOT: { id: adminId },
                    },
                    select: { id: true },
                });

                if (emailExists) {
                    throw new AppError(409, "Email already in use");
                }

                // Only active accounts can change email (optional but recommended)
                if (!admin.isActive) {
                    throw new AppError(
                        403,
                        "Cannot update email. Account must be active to change email address"
                    );
                }

                // 🚀 Versioning: bump emailVerifyVersion atomically and get latest email
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
                    ownerId: adminId,                        // keep "ownerId" field if that's what your verify code expects
                    newEmail: email,
                    oldEmail: updatedForVersion.email,
                    version: updatedForVersion.emailVerifyVersion,
                });

                emailChangeLink = `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(
                    token
                )}`;

                // NOTE:
                //   We are NOT updating admin.email here.
                //   The verify-email-change endpoint will:
                //   - validate token + version
                //   - apply the new email
            }

            // 8. If nothing at all is changing, bail out
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

            // 9. Apply updates

            if (hasAdminChanges) {
                await tx.admin.update({
                    where: { id: adminId },
                    data: adminUpdateData,
                });
            }

            if (hasProfileChanges) {
                if (admin.profile) {
                    await tx.adminProfile.update({
                        where: { adminId },
                        data: adminProfileUpdateData,
                    });
                } else {
                    throw new AppError(
                        404,
                        "Owner profile not found. Please create profile first."
                    );
                }
            }

            // 10. Fetch updated owner with profile
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
                emailChangeLink, // null if email not changed
                phoneOtpSent,    // true if phone changed (and OTP should be sent)
            };
        });
    } catch (err: any) {
        if (err instanceof AppError) {
            throw err;
        }

        // Prisma unique constraint handling (optional but nice)
        if (err?.code === "P2002") {
            const target = (err.meta && (err.meta.target as string[] | undefined)) || [];
            if (target.some((t: any) => t.toLowerCase().includes("phone"))) {
                throw new AppError(409, "Phone number already in use");
            }
            if (target.some((t: any) => t.toLowerCase().includes("email"))) {
                throw new AppError(409, "Email already in use");
            }
            throw new AppError(409, "Unique constraint violation");
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








