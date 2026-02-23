export const OwnerProfileBodySchema = {
    type: "object",
    required: ["adminId", "photoUrl", "preferredLanguage", "phoneVerificationToken"],
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
            description: "Public URL of the owner's profile picture",
        },

        preferredLanguage: {
            type: "string",
            enum: ["EN", "HI", "TE"],
            example: "EN",
            description: "Preferred language code for communication",
        },

        shortBio: {
            type: "string",
            example: "Experienced property owner and manager.",
            description: "Short description/bio of the owner",
        },

        // 🔐 Phone verification token (JWT from OTP verification step)
        phoneVerificationToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            description:
                "JWT issued after successful phone OTP verification. Encodes normalized phone and verification flag.",
        },
    },

    errorMessage: {
        required: {
            adminId: "adminId is required",
            photoUrl: "photoUrl is required",
            preferredLanguage: "preferredLanguage is required",
            phoneVerificationToken:
                "phoneVerificationToken is required. Please verify your phone first.",
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

        // 🔹 Admin fields
        fullName: {
            type: "string",
            minLength: 2,
            example: "Rahul Sharma",
        },

        email: {
            type: "string",
            format: "email",
            example: "rahul.sharma@example.com",
            description:
                "Changing email triggers verification flow. Cannot change email and phone together.",
        },

        // 🔹 AdminProfile fields
        photoUrl: {
            type: "string",
            format: "uri",
            example: "https://example.com/profile.jpg",
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

        // 🔐 Phone change via OTP verification token
        phoneVerificationToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            description:
                "JWT issued after successful phone OTP verification. Encodes normalized phone and verification flag. Cannot be used together with email change.",
        },
    },

    /**
     * At least one updatable field must be present
     */
    anyOf: [
        { required: ["fullName"] },
        { required: ["email"] },
        { required: ["photoUrl"] },
        { required: ["preferredLanguage"] },
        { required: ["shortBio"] },
        { required: ["phoneVerificationToken"] },
    ],

    errorMessage: {
        required: {
            adminId: "adminId is required",
        },
        anyOf:
            "At least one field (fullName, email, photoUrl, preferredLanguage, shortBio, phoneVerificationToken) must be provided for update",
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
            additionalProperties: false,
            required: ["success", "message", "profile"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Owner profile updated successfully.",
                },
                profile: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "id",
                        "adminId",
                        "phone",
                        "preferredLanguage",
                        "admin",
                    ],
                    properties: {
                        id: {
                            type: "string",
                            example: "profile-uuid",
                        },
                        adminId: {
                            type: "string",
                            example: "admin-uuid",
                        },
                        phone: {
                            type: "string",
                            example: "919876543210", // normalized with country code
                        },
                        preferredLanguage: {
                            type: "string",
                            example: "EN", // matches enum ["EN", "HI", "TE"]
                        },
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
                            additionalProperties: false,
                            required: ["fullName", "email"],
                            properties: {
                                fullName: {
                                    type: "string",
                                    example: "John Doe",
                                },
                                email: {
                                    type: "string",
                                    example: "john@example.com",
                                },
                            },
                        },
                    },
                },
            },
        },

        // 🔹 400 – Validation + phone not verified + missing fields
        400: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "Phone number is not verified - Please verify first before update.",
                    // Other possible messages from service:
                    // - "Admin ID is required."
                    // - "Photo URL is required."
                    // - "Preferred language is required."
                },
            },
        },

        404: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: { type: "string", example: "Owner not found" },
            },
        },

        409: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Profile already completed",
                    // Another possible message from service:
                    // "Phone number already in use"
                },
            },
        },

        500: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Owner profile creation failed: Unknown error",
                    // Other possible messages from service:
                    // - "Database error while creating owner profile."
                },
            },
        },
    },

    UpdateOwnerProfileResponseSchema: {
        200: {
            type: "object",
            additionalProperties: false,
            required: [
                "success",
                "message",
                "emailVerificationRequired",
                "emailChangeLink",
                "phoneChanged",
                "owner",
            ],
            properties: {
                success: { type: "boolean", example: true },

                message: {
                    type: "string",
                    example: "Owner profile updated successfully",
                },

                emailVerificationRequired: {
                    type: "boolean",
                    example: false,
                    description:
                        "True if email was changed and verification via email link is required",
                },

                emailChangeLink: {
                    type: ["string", "null"],
                    example: null,
                    description:
                        "Email verification link (present only if emailVerificationRequired is true)",
                },

                phoneChanged: {
                    type: "boolean",
                    example: false,
                    description:
                        "True if the phone number was updated using phoneVerificationToken",
                },

                owner: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                        "id",
                        "fullName",
                        "email",
                        "isActive",
                        "isProfileComplete",
                    ],
                    properties: {
                        id: { type: "string", example: "admin-uuid" },
                        fullName: { type: "string", example: "John Owner" },
                        email: { type: "string", example: "owner@example.com" },

                        isActive: { type: "boolean", example: true },
                        isProfileComplete: { type: "boolean", example: true },

                        profile: {
                            type: ["object", "null"],
                            description:
                                "Owner profile details. Null if profile has not been created yet.",
                            properties: {
                                id: { type: "string", example: "profile-uuid" },
                                adminId: { type: "string", example: "admin-uuid" },

                                phone: {
                                    type: "string",
                                    example: "919876543210",
                                    description:
                                        "Normalized phone number with country code (digits only)",
                                },

                                countryCode: {
                                    type: ["string", "null"],
                                    example: "+91",
                                },

                                preferredLanguage: {
                                    type: "string",
                                    example: "EN",
                                },

                                photoUrl: {
                                    type: ["string", "null"],
                                    example: "https://cdn.example.com/profile.jpg",
                                },

                                shortBio: {
                                    type: ["string", "null"],
                                    example: "Experienced property owner",
                                },
                            },
                        },
                    },
                },
            },
        },

        400: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "You can update either email or phone at a time, not both / No changes provided to update",
                },
            },
        },

        403: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "Cannot update email. Account must be active to change email address",
                },
            },
        },

        404: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Owner not found / Owner profile not found",
                },
            },
        },

        409: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "Email already in use / Phone number already in use by another owner",
                },
            },
        },

        500: {
            type: "object",
            additionalProperties: false,
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
    VerifyOwnerEmailChangeResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message", "owner"],
            properties: {
                success: {
                    type: "boolean",
                    example: true,
                },

                message: {
                    type: "string",
                    example: "Email change verified successfully",
                },

                owner: {
                    type: "object",
                    required: [
                        "id",
                        "fullName",
                        "email",
                        "isActive",
                        "isProfileComplete",
                    ],
                    properties: {
                        id: {
                            type: "string",
                            example: "admin-uuid",
                        },

                        fullName: {
                            type: "string",
                            example: "John Owner",
                        },

                        email: {
                            type: "string",
                            example: "newemail@example.com",
                        },

                        isActive: {
                            type: "boolean",
                            example: true,
                        },

                        isProfileComplete: {
                            type: "boolean",
                            example: true,
                        },

                        profile: {
                            type: ["object", "null"],
                            properties: {
                                id: {
                                    type: "string",
                                    example: "profile-uuid",
                                },

                                adminId: {
                                    type: "string",
                                    example: "admin-uuid",
                                },

                                phone: {
                                    type: "string",
                                    example: "9999999999",
                                },

                                countryCode: {
                                    type: ["string", "null"],
                                    example: "+91",
                                },

                                preferredLanguage: {
                                    type: "string",
                                    example: "EN",
                                },

                                photoUrl: {
                                    type: ["string", "null"],
                                    example: "https://cdn.example.com/profile.jpg",
                                },

                                shortBio: {
                                    type: ["string", "null"],
                                    example: "Experienced property owner",
                                },
                            },
                        },
                    },
                },
            },
        },

        400: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "Invalid or expired email change token / This email change link is no longer valid",
                },
            },
        },

        401: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Token expired / Invalid token",
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
                    example: "Email already in use by another owner",
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
                    example: "Email change verification failed",
                },
            },
        },
    },
    GetOwnerProfileResponseSchema: {
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