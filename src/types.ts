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

export type EmailChangeTokenPayload = {
    adminId: string;
    newEmail: string;
    oldEmail: string;
}