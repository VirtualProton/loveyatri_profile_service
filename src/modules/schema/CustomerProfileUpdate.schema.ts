export const CustomerProfileUpdateSchema = {
    type: "object",
    required: ["customerId"],
    additionalProperties: false,

    properties: {
        customerId: {
            type: "string",
            example: "a1b2c3d4-uuid",
            description: "Customer ID",
        },

        fullName: {
            type: "string",
            example: "John Doe",
            description: "Full name of the customer",
        },

        photoUrl: {
            type: "string",
            format: "uri",
            example: "https://example.com/profile.jpg",
            description: "URL of the profile picture",
        },

        phone: {
            type: "string",
            minLength: 10,
            maxLength: 10,
            example: "9876543210",
            description: "Phone number",
        },

        address: {
            type: ["string", "null"],
            example: "123 Main Street, City, State, 12345",
            description: "Address of the customer",
        },

        email: {
            type: "string",
            format: "email",
            example: "john.doe@example.com",
            description: "New email address (requires verification if changed)",
        },
    },

    errorMessage: {
        required: {
            customerId: "customerId is required",
        },
        properties: {
            email: "email must be a valid email address",
            phone: "phone must be 10 digits",
        },
        additionalProperties: "Additional properties are not allowed",
    },
};

export const ResponseSchema = {
    CustomerProfileUpdateResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message", "customer"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Customer profile updated successfully",
                },

                // true if an email-change flow was triggered
                emailVerificationRequired: {
                    type: "boolean",
                    example: false,
                    description:
                        "True if email was updated and verification via link is required",
                },

                // the actual link we return when email changes
                emailVerificationLink: {
                    type: ["string", "null"],
                    example: null,
                    description:
                        "Email verification link (present only if emailVerificationRequired is true)",
                },

                // true if phone was changed and an OTP has been (or should be) sent
                phoneOtpSent: {
                    type: "boolean",
                    example: false,
                    description:
                        "True if phone number was updated and an OTP was sent to the new phone number",
                },

                customer: {
                    type: "object",
                    required: ["id", "fullName", "isActive", "isProfileComplete"],
                    properties: {
                        id: { type: "string", example: "customer-uuid" },
                        fullName: { type: "string", example: "John Doe" },

                        email: {
                            type: ["string", "null"],
                            example: "john@example.com",
                        },
                        pendingEmail: {
                            type: ["string", "null"],
                            example: "newemail@example.com",
                        },

                        // convenience field – usually mapped from profile.phone
                        phoneNumber: {
                            type: ["string", "null"],
                            example: "9999999999",
                        },

                        isActive: { type: "boolean", example: true },
                        isProfileComplete: { type: "boolean", example: true },

                        profile: {
                            type: ["object", "null"],
                            properties: {
                                id: { type: "string", example: "profile-uuid" },
                                customerId: { type: "string", example: "customer-uuid" },
                                fullName: { type: "string", example: "John Doe" },
                                email: {
                                    type: ["string", "null"],
                                    example: "john@example.com",
                                },
                                phone: {
                                    type: ["string", "null"],
                                    example: "9999999999",
                                },
                                photoUrl: {
                                    type: ["string", "null"],
                                    example: "https://cdn.example.com/profile.jpg",
                                },
                                countryCode: {
                                    type: ["string", "null"],
                                    example: "+91",
                                },
                                address: {
                                    type: ["string", "null"],
                                    example: "123 Main Street, City, State, 12345",
                                },
                            },
                        },
                    },
                },
            },
        },

        403: {
            type: "object",
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
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example:
                        "Customer not found / Customer profile not found. Please create profile first.",
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
                        "Phone number already in use by another customer / Email already in use by another customer",
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
                    example: "Customer profile update failed",
                },
            },
        },
    }
};
