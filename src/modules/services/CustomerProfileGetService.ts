import { AppError } from "../../utils/appError.js";
import { prisma } from "../../utils/prisma.js";

export const CustomerProfileGetService = async (customerId: string) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                CustomerProfile: true
            },
        });

        if (!customer) {
            throw new AppError(404, "Customer not found");
        }

        return customer;
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            500,
            "Failed to fetch customer details: " + err.message
        );
    }
};
