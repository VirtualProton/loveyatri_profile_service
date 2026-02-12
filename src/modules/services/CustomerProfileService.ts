import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";

export const CustomerProfileService = async (data: {
    customerId: string;
    photoUrl: string;
    phone: string;
    address?: string | null;
}) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const existingCustomer = await tx.customer.findUnique({
                where: { id: data.customerId },
                select: { 
                    isProfileComplete: true,
                    fullName: true,
                    email: true
                },
            });

            if (!existingCustomer) {
                throw new AppError(404, "Customer not found");
            }

            if (existingCustomer.isProfileComplete) {
                throw new AppError(409, "Profile already completed");
            }

            const phoneExists = await tx.customerProfile.findUnique({
                where: { phone: data.phone },
                select: { id: true },
            });

            if (phoneExists) {
                throw new AppError(409, "Phone number already in use");
            }

            // Check if email is already used in another profile
            if (existingCustomer.email) {
                const emailExists = await tx.customerProfile.findUnique({
                    where: { email: existingCustomer.email },
                    select: { id: true },
                });

                if (emailExists) {
                    throw new AppError(409, "Email already in use by another profile");
                }
            }

            const profile = await tx.customerProfile.create({
                data: {
                    customerId: data.customerId,
                    fullName: existingCustomer.fullName,
                    email: existingCustomer.email ?? null,
                    photoUrl: data.photoUrl,
                    phone: data.phone,
                    address: data.address ?? null,
                },
                include: {
                    Customer: {
                        select: { fullName: true, email: true }
                    }
                },
            });

            await tx.customer.update({
                where: { id: data.customerId },
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
            "Customer profile creation failed" + err.message
        );
    }
};
