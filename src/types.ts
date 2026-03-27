import type { FastifyRequest } from "fastify";

export type OwnerProfileRequestBody = {
  adminId: string;
  photoUrl: string;
  preferredLanguage: string;
  shortBio?: string;

  // 🔐 Phone verification token (can come from header, body optional fallback)
  phoneVerificationToken?: string;

  // 🔽 Optional fields from AdminProfile schema
  countryCode?: string;
  isGstRegistered?: boolean;
  gstNumber?: string;
  gstLegalName?: string;
  gstStateCode?: string;
  gstBillingAddress?: string;
  pincode?: string;
};

export type OwnerProfileRequest = FastifyRequest<{
  Body: OwnerProfileRequestBody;
}>;

export type OwnerProfileUpdateRequestBody = {
  adminId: string;
  fullName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  preferredLanguage?: string | null;
  shortBio?: string | null;
  phoneVerificationToken?: string | null;

  countryCode?: string | null;
  isGstRegistered?: boolean | null;
  gstNumber?: string | null;
  gstLegalName?: string | null;
  gstStateCode?: string | null;
  gstBillingAddress?: string | null;
  pincode?: string | null;
};

export type OwnerProfileUpdateRequest = FastifyRequest<{
  Body: OwnerProfileUpdateRequestBody;
}>;

export type CustomerProfileRequest = FastifyRequest<{
    Body: {
        photoUrl: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        countryCode?: string | null;
        verificationToken: string; // required
    };
}>;

export type CustomerProfileUpdateRequest = FastifyRequest<{
    Body: {
        customerId: string;
        fullName?: string;
        photoUrl?: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        countryCode?: string | null;
        email?: string;
        verificationToken?: string; // used when changing phone
    };
}>;

export type CustomerProfileGetRequest = FastifyRequest<{
    Querystring: {
        customerId: string;
    };
}>;

export type CreatePlatformReviewRequest = FastifyRequest<{
    Body: {
        rating: number;
        title: string;
        review: string;
    };
}>;

export type UpdatePlatformReviewRequest = FastifyRequest<{
    Params: {
        reviewId: string;
    };
    Body: {
        rating?: number;
        title?: string;
        review?: string;
    };
}>;

export type DeletePlatformReviewRequest = FastifyRequest<{
    Params: {
        reviewId: string;
    };
}>;

export type EmailChangeTokenPayload = {
    adminId?: string;
    ownerId?: string;
    customerId?: string;
    newEmail: string;
    oldEmail: string;
    version?: number;
}
