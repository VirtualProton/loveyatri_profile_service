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
};