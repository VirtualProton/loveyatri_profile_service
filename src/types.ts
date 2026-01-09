import type { FastifyRequest } from "fastify";

export type OwnerRegistrationRequest = FastifyRequest<{
    Body: {
        fullName: string;
        email: string;
        password: string;
        re_password: string;
    };
}>;

export type OwnerSignInRequest = FastifyRequest<{
    Body: {
        email: string;
        password: string;
    };
}>;

export type OwnerProfileRequest =FastifyRequest<{
    Body: {
        adminId: string;
        photoUrl: string;
        phone: string;
        preferredLanguage: string;
        shortBio?: string;
    };
}>

export type OwnerChangePasswordRequest = FastifyRequest<{
    Body: {
        oldPassword: string;
        newPassword: string;
        re_newPassword: string;
    };
}>;