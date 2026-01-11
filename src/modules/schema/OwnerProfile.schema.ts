export const OwnerProfileSchema = {
    type: "object",
    required: ["adminId", "photoUrl", "phone", "preferredLanguage"],
    additionalProperties: false,

    properties: {
        adminId: {
            type: "string",
            example: "a1b2c3d4-uuid",
            description: "Admin ID (FK to Admin table)",
        },

        photoUrl: {
            type: "string",
            format: "uri",
            example: "https://example.com/profile.jpg",
        },

        phone: {
            type: "string",
            minLength: 10,
            maxLength: 10,
            example: "9876543210",
        },

        preferredLanguage: {
            type: "string",
            enum: ["EN", "HI", "TE"],
            example: "EN",
        },

        shortBio: {
            type: "string",
            example: "Experienced property owner and manager.",
        },
    },

    errorMessage: {
        required: {
            adminId: "adminId is required",
            photoUrl: "photoUrl is required",
            phone: "phone number is required",
            preferredLanguage: "preferredLanguage is required",
        },
        properties: {
            preferredLanguage:
                "preferredLanguage must be one of EN, HI, or TE",
        },
        additionalProperties: "Additional properties are not allowed",
    },
};



export const OwnerProfileUpdateSchema = {
    type: "object",

    required: ["adminId"],

    additionalProperties: false,

    properties: {
        adminId: {
            type: "string",
            example: "a1b2c3d4-uuid",
            description: "Admin ID (FK to Admin table)",
        },

        fullName: {
            type: "string",
            minLength: 2,
            example: "Rahul Sharma",
        },

        email: {
            type: "string",
            format: "email",
            example: "rahul.sharma@example.com",
        },

        photoUrl: {
            type: "string",
            format: "uri",
            example: "https://example.com/profile.jpg",
        },

        phone: {
            type: "string",
            minLength: 10,
            maxLength: 10,
            example: "9876543210",
        },

        preferredLanguage: {
            type: "string",
            enum: ["EN", "HI", "TE"],
            example: "EN",
        },

        /**
         * Nullable: allows clearing shortBio explicitly
         */
        shortBio: {
            type: ["string", "null"],
            example: "Experienced property owner and manager.",
        },
    },

    /**
     * At least one updatable field must be present
     * (shortBio = null also counts as a valid update)
     */
    anyOf: [
        { required: ["fullName"] },
        { required: ["email"] },
        { required: ["photoUrl"] },
        { required: ["phone"] },
        { required: ["preferredLanguage"] },
        { required: ["shortBio"] },
    ],

    errorMessage: {
        required: {
            adminId: "adminId is required",
        },
        anyOf:
            "At least one field (fullName, email, photoUrl, phone, preferredLanguage, shortBio) must be provided for update",
        properties: {
            email: "email must be a valid email address",
            preferredLanguage:
                "preferredLanguage must be one of EN, HI, or TE",
        },
        additionalProperties: "Additional properties are not allowed",
    },
};


export const EmailVerificationSchema = {
    type: "object",
    required: ["token"],
    additionalProperties: false,

    properties: {
        token: {
            type: "string",
            example: "<jwt_verification_token>",
            errorMessage: {
                format: "Token must be a valid string"
            }
        }
    },

    errorMessage: {
        required: {
            token: "Token is required"
        }
    }
};

export const getOwnerProfileSchema = {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    properties: {
        id: {
            type: "string",
            example: "a1b2c3d4-uuid",
            errorMessage: {
                format: "id must be a valid string"
            }
        }
    },
    errorMessage: {
        required: {
            id: "id is required"
        }
    }
};





export const ResponseSchema = {
    OwnerProfileResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message", "profile"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Owner profile updated successfully",
                },
                profile: {
                    type: "object",
                    required: [
                        "id",
                        "adminId",
                        "phone",
                        "preferredLanguage",
                        "admin",
                    ],
                    properties: {
                        id: { type: "string", example: "profile-uuid" },
                        adminId: { type: "string", example: "admin-uuid" },
                        phone: { type: "string", example: "9999999999" },
                        preferredLanguage: { type: "string", example: "en" },
                        shortBio: {
                            type: ["string", "null"],
                            example: "Property owner based in Mumbai",
                        },
                        photoUrl: {
                            type: "string",
                            example: "https://cdn.example.com/profile.jpg",
                        },
                        admin: {
                            type: "object",
                            required: ["fullName", "email"],
                            properties: {
                                fullName: { type: "string", example: "John Doe" },
                                email: { type: "string", example: "john@example.com" },
                            },
                        },
                    },
                },
            },
        },

        404: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: { type: "string", example: "Owner not found" },
            },
        },

        409: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Profile already completed / Phone number already in use",
                },
            },
        },

        500: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Owner profile creation failed",
                },
            },
        },
    },

    UpdateOwnerProfileResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Owner profile updated successfully",
                },
                emailChangeLink: {
                    type: ["string", "null"],
                    example:
                        "https://app.example.com/verify-email-change?token=encoded-token",
                    description:
                        "Returned only when email change verification is required",
                },
            },
        },

        404: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Owner not found",
                },
            },
        },

        409: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "Email already in use / Provided email is already associated with your account",
                },
            },
        },

        500: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Owner profile update failed",
                },
            },
        },
    },
    VerifyEmailChangeResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: {
                    type: "boolean",
                    example: true,
                },
                message: {
                    type: "string",
                    example: "Email change verified successfully",
                },
            },
        },

        401: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: {
                    type: "boolean",
                    example: false,
                },
                message: {
                    type: "string",
                    example: "Invalid or expired token",
                },
            },
        },

        404: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: {
                    type: "boolean",
                    example: false,
                },
                message: {
                    type: "string",
                    example: "Admin not found or email mismatch",
                },
            },
        },

        500: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: {
                    type: "boolean",
                    example: false,
                },
                message: {
                    type: "string",
                    example: "Email change verification failed",
                },
            },
        },
    },
    GetOwnerProfileResponseSchema :{
        200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
                success: {
                    type: "boolean",
                    example: true,
                },
                message: {
                    type: "string",
                    example: "Owner profile fetched successfully",
                },
                data: {
                    type: "object",
                    required: ["id", "email", "fullName", "profile"],
                    properties: {
                        id: {
                            type: "string",
                            example: "admin_12345",
                        },
                        email: {
                            type: "string",
                            example: "owner@example.com",
                        },
                        fullName: {
                            type: "string",
                            example: "John Doe",
                        },
                        profile: {
                            type: "object",
                            nullable: true,
                            required: [
                                "id",
                                "createdAt",
                                "updatedAt",
                                "photoUrl",
                                "phone",
                                "countryCode",
                                "preferredLanguage",
                                "shortBio",
                                "adminId",
                            ],
                            properties: {
                                id: {
                                    type: "string",
                                    example: "profile_123",
                                },
                                createdAt: {
                                    type: "string",
                                    format: "date-time",
                                    example: "2025-01-01T10:00:00.000Z",
                                },
                                updatedAt: {
                                    type: "string",
                                    format: "date-time",
                                    example: "2025-01-10T12:00:00.000Z",
                                },
                                photoUrl: {
                                    type: "string",
                                    example: "https://example.com/photo.jpg",
                                },
                                phone: {
                                    type: "string",
                                    example: "+1234567890",
                                },
                                countryCode: {
                                    type: ["string", "null"],
                                    example: "US",
                                },
                                preferredLanguage: {
                                    type: "string",
                                    example: "en",
                                },
                                shortBio: {
                                    type: ["string", "null"],
                                    example: "Experienced platform owner",
                                },
                                adminId: {
                                    type: "string",
                                    example: "admin_12345",
                                },
                            },
                        },
                    },
                },
            },
        },

        404: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: {
                    type: "boolean",
                    example: false,
                },
                message: {
                    type: "string",
                    example: "Owner profile not found",
                },
            },
        },

        500: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: {
                    type: "boolean",
                    example: false,
                },
                message: {
                    type: "string",
                    example: "Fetching Owner profile failed",
                },
            },
        },
    }

};