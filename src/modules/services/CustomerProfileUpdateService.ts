import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";
import { signEmailVerifyToken, buildVerifyLink } from "../../utils/generateEmailVerificationToken.js";

export const CustomerProfileUpdateService = async (data: {
    customerId: string;
    fullName?: string;
    photoUrl?: string;
    phone?: string;
    address?: string | null;
    email?: string;
}) => {
    try {
        return await prisma.$transaction(async (tx) => {
            // Get current customer and profile
            const customer = await tx.customer.findUnique({
                where: { id: data.customerId },
                include: {
                    profile: true
                },
            });

            if (!customer) {
                throw new AppError(404, "Customer not found");
            }

            const updateData: any = {};
            const profileUpdateData: any = {};

            // Update fullName if provided (update both Customer and CustomerProfile)
            if (data.fullName !== undefined) {
                updateData.fullName = data.fullName;
                profileUpdateData.fullName = data.fullName;
            }

            // Update photoUrl if provided
            if (data.photoUrl !== undefined) {
                profileUpdateData.photoUrl = data.photoUrl;
            }

            // Update address if provided
            if (data.address !== undefined) {
                profileUpdateData.address = data.address;
            }

            // Handle phone number update
            if (data.phone !== undefined) {
                const currentPhone = customer.profile?.phone;
                
                // If phone is different from current
                if (data.phone !== currentPhone) {
                    // Check if phone is already used by another customer
                    const phoneExists = await tx.customerProfile.findFirst({
                        where: {
                            phone: data.phone,
                            NOT: {
                                customerId: data.customerId
                            }
                        },
                        select: { id: true },
                    });

                    if (phoneExists) {
                        throw new AppError(409, "Phone number already in use by another customer");
                    }

                    profileUpdateData.phone = data.phone;
                }
            }

            // Handle email update
            let emailVerificationToken: string | null = null;
            let emailVerificationLink: string | null = null;

            if (data.email !== undefined) {
                const currentEmail = customer.email;
                
                // If email is different from current
                if (data.email !== currentEmail) {
                    // Check if email is already used by another customer (including in pendingEmail)
                    const emailExistsInCustomer = await tx.customer.findFirst({
                        where: {
                            OR: [
                                { email: data.email },
                                { pendingEmail: data.email }
                            ],
                            id: { not: data.customerId }
                        },
                        select: { id: true },
                    });

                    // Check if email is already used in another CustomerProfile
                    const emailExistsInProfile = await tx.customerProfile.findFirst({
                        where: {
                            email: data.email,
                            NOT: {
                                customerId: data.customerId
                            }
                        },
                        select: { id: true },
                    });

                    if (emailExistsInCustomer || emailExistsInProfile) {
                        throw new AppError(409, "Email already in use by another customer");
                    }

                    // Only allow email update if customer isActive is true
                    if (!customer.isActive) {
                        throw new AppError(403, "Cannot update email. Account must be active to change email address");
                    }

                    // Store email in pendingEmail and generate verification token
                    updateData.pendingEmail = data.email;
                    
                    // Generate email verification token (using ownerId field name for compatibility with existing token function)
                    emailVerificationToken = signEmailVerifyToken({
                        ownerId: data.customerId, // Note: field name is ownerId but contains customerId
                        email: data.email
                    });
                    
                    emailVerificationLink = buildVerifyLink(emailVerificationToken);
                }
            }

            // Update customer if there are changes
            if (Object.keys(updateData).length > 0) {
                await tx.customer.update({
                    where: { id: data.customerId },
                    data: updateData,
                });
            }

            // Update profile if there are changes and profile exists
            if (Object.keys(profileUpdateData).length > 0) {
                if (customer.profile) {
                    await tx.customerProfile.update({
                        where: { customerId: data.customerId },
                        data: profileUpdateData,
                    });
                } else {
                    // If profile doesn't exist, we can't update it
                    throw new AppError(404, "Customer profile not found. Please create profile first.");
                }
            }

            // Fetch updated customer with profile
            const updatedCustomer = await tx.customer.findUnique({
                where: { id: data.customerId },
                include: {
                    profile: true
                },
            });

            return {
                customer: updatedCustomer,
                emailVerificationToken,
                emailVerificationLink,
            };
        });
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            500,
            "Customer profile update failed: " + err.message
        );
    }
};
