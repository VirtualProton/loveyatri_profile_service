export const CustomerProfileSchema = {
    type: "object",
    required: ["customerId", "photoUrl", "phone"],
    additionalProperties: false,

    properties: {
        customerId: {
            type: "string",
            example: "a1b2c3d4-uuid",
            description: "Customer ID (FK to Customer table)",
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

        address: {
            type: "string",
            example: "123 Main Street, City, State, 12345",
        },
    },

    errorMessage: {
        required: {
            customerId: "customerId is required",
            photoUrl: "photoUrl is required",
            phone: "phone number is required",
        },
        additionalProperties: "Additional properties are not allowed",
    },
};

export const ResponseSchema = {
    CustomerProfileResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message", "profile"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Customer profile updated successfully",
                },
                profile: {
                    type: "object",
                    required: [
                        "id",
                        "customerId",
                        "fullName",
                        "email",
                        "phone",
                        "customer",
                    ],
                    properties: {
                        id: { type: "string", example: "profile-uuid" },
                        customerId: { type: "string", example: "customer-uuid" },
                        fullName: { type: "string", example: "John Doe" },
                        email: { type: ["string", "null"], example: "john@example.com" },
                        phone: { type: "string", example: "9999999999" },
                        photoUrl: {
                            type: "string",
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
                        customer: {
                            type: "object",
                            required: ["fullName", "email"],
                            properties: {
                                fullName: { type: "string", example: "John Doe" },
                                email: { type: ["string", "null"], example: "john@example.com" },
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
                message: { type: "string", example: "Customer not found" },
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
                    example: "Customer profile creation failed",
                },
            },
        },
    },
};
