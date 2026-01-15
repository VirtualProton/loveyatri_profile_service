export const CustomerProfileGetQuerySchema = {
    type: "object",
    required: ["customerId"],
    additionalProperties: false,
    properties: {
        customerId: {
            type: "string",
            example: "a1b2c3d4-uuid",
            description: "Customer ID",
        },
    },
    errorMessage: {
        required: {
            customerId: "customerId is required",
        },
        additionalProperties: "Additional properties are not allowed",
    },
};

export const ResponseSchema = {
    CustomerProfileGetResponseSchema: {
        200: {
            type: "object",
            required: ["success", "message", "customer"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Customer details retrieved successfully",
                },
                customer: {
                    type: "object",
                    required: [
                        "id",
                        "fullName",
                    ],
                    properties: {
                        id: { type: "string", example: "customer-uuid" },
                        fullName: { type: "string", example: "John Doe" },
                        email: { type: ["string", "null"], example: "john@example.com" },
                        pendingEmail: { type: ["string", "null"], example: "newemail@example.com" },
                        phoneNumber: { type: ["string", "null"], example: "9999999999" },
                        googleId: { type: ["string", "null"], example: "google-123" },
                        isActive: { type: "boolean", example: true },
                        isProfileComplete: { type: "boolean", example: true },
                        createdAt: { type: "string", format: "date-time", example: "2024-01-01T00:00:00.000Z" },
                        updatedAt: { type: "string", format: "date-time", example: "2024-01-01T00:00:00.000Z" },
                        profile: {
                            type: ["object", "null"],
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
                                createdAt: { type: "string", format: "date-time", example: "2024-01-01T00:00:00.000Z" },
                                updatedAt: { type: "string", format: "date-time", example: "2024-01-01T00:00:00.000Z" },
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

        500: {
            type: "object",
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: {
                    type: "string",
                    example: "Failed to fetch customer details",
                },
            },
        },
    },
};
