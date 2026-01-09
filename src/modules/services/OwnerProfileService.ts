import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";

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