import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";

export const CustomerProfileGetService = async (customerId: string) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true,
        CustomerProfile: {
          select: {
            id: true,
            customerId: true,
            photoUrl: true,
            phone: true,
            countryCode: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, "Customer not found");
    }

    return {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      isActive: customer.isActive,
      isProfileComplete: customer.isProfileComplete,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      profile: customer.CustomerProfile,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, "Failed to fetch customer details: " + err.message);
  }
};
