import type { FastifyRequest } from "fastify";

export type OwnerProfileRequestBody = {
    adminId: string;
    photoUrl: string;
    preferredLanguage: string;
    shortBio?: string;

    // 🔐 Phone verification token (JWT from OTP verification step)
    phoneVerificationToken: string;
}

export type OwnerProfileRequest = FastifyRequest<{
    Body: OwnerProfileRequestBody;
}>;

export type OwnerProfileUpdateRequest = FastifyRequest<{
  Body: {
    adminId: string;

    // Admin
    fullName?: string;
    email?: string;

    // AdminProfile
    photoUrl?: string;
    preferredLanguage?: string;
    shortBio?: string | null;

    // 🔐 Phone change via verification token (OTP flow)
    // If present and decodes to a different phone, phone will be updated.
    // Client must NOT send `phone` directly anymore.
    phoneVerificationToken?: string;
  };
}>;

export type CustomerProfileRequest = FastifyRequest<{
    Body: {
        customerId: string;
        photoUrl: string;
        address?: string | null;
        verificationToken: string; // required
    };
}>;

export type CustomerProfileUpdateRequest = FastifyRequest<{
    Body: {
        customerId: string;
        fullName?: string;
        photoUrl?: string;
        address?: string | null;
        email?: string;
        verificationToken?: string; // used when changing phone
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
