import type { FastifyRequest } from "fastify";

export type OwnerProfileRequest =FastifyRequest<{
    Body: {
        adminId: string;
        photoUrl: string;
        phone: string;
        preferredLanguage: string;
        shortBio?: string;
    };
}>

export type OwnerProfileUpdateRequest = FastifyRequest<{
    Body: {
        adminId: string;

        // Admin
        fullName?: string;
        email?: string;

        // AdminProfile
        photoUrl?: string;
        phone?: string;
        preferredLanguage?: string;
        shortBio?: string | null;
    };
}>;

export type CustomerProfileRequest = FastifyRequest<{
    Body: {
        customerId: string;
        photoUrl: string;
        phone: string;
        address?: string | null;
    };
}>;

export type CustomerProfileUpdateRequest = FastifyRequest<{
    Body: {
        customerId: string;
        fullName?: string;
        photoUrl?: string;
        phone?: string;
        address?: string | null;
        email?: string;
    };
}>;

export type CustomerProfileGetRequest = FastifyRequest<{
    Body: {
        customerId: string;
    };
}>;
export type EmailChangeTokenPayload = {
    adminId: string;
    newEmail: string;
    oldEmail: string;
}
