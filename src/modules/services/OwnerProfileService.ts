import { env } from "../../config/env.js";
// import { OwnerProfileUpdateRequest } from "../../types.js";
import { AppError } from "../../utils/appError.js";
import { signEmailChangeToken } from "../../utils/generateEmailVerificationToken.js";
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


export const UpdateOwnerProfileService = async (data: any) => {
    try {
        const { adminId, email, ...updatedData } = data;
        let emailChangeLink = null;
        if (email) {
            const admin = await prisma.admin.findUnique({
                where: { email: email },
                select: {
                    id: true,
                    email: true
                },
            })

            if (admin && admin.id !== adminId) {
                throw new AppError(409, "Email already in use");
            }

            if (admin && admin.id === adminId) {
                throw new AppError(409, "Provided email is already associated with your account");
            }

            const token: any = await signEmailChangeToken({
                adminId: adminId,
                newEmail: email,
                oldEmail: admin ? admin.email : ""
            });

            emailChangeLink = `${env.APP_URL}/verify-email-change?token=${encodeURIComponent(token)}`;
        }

        const updatedAdminData: any = {};
        const updateAdminProfile: any = {};


        if (updatedData.fullName) updatedAdminData.fullName = data.fullName;
        if (updatedData.photoUrl) updateAdminProfile.photoUrl = data.photoUrl;
        if (updatedData.phone) updateAdminProfile.phone = data.phone;
        if (updatedData.preferredLanguage) updateAdminProfile.preferredLanguage = data.preferredLanguage;
        if (updatedData.shortBio !== undefined) updateAdminProfile.shortBio = data.shortBio;

        await prisma.$transaction(async (tx) => {
            if (Object.keys(updatedAdminData).length > 0) {
                await tx.admin.update({
                    where: { id: adminId },
                    data: updatedAdminData
                });
            }
            if (Object.keys(updateAdminProfile).length > 0) {
                await tx.adminProfile.update({
                    where: { adminId: adminId },
                    data: updateAdminProfile
                });
            }
        });
        return emailChangeLink;
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            500,
            "Owner profile update failed" + err.message
        );
    }
}


export const verifyEmailChangeTokenService = async (token: string) => {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as {
            adminId: string;
            newEmail: string;
            oldEmail: string;
        };

        if (!payload || !payload.adminId || !payload.newEmail || !payload.oldEmail) {
            throw new AppError(401, "Invalid or expired token");
        }

        await prisma.admin.update({
            where: { id: payload.adminId, email: payload.oldEmail },
            data: { email: payload.newEmail }
        });
        return true;
    } catch (err: any) {
        if (err instanceof AppError) throw err;

        if (err instanceof jwt.TokenExpiredError) {
            throw new AppError(401, "Token expired");
        }

        if (err instanceof jwt.JsonWebTokenError) {
            throw new AppError(401, "Invalid token");
        }

        throw new AppError(500, "Email change verification failed");
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
    }catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            500,
            "Fetching Owner profile failed" + err.message
        );
    }
}








