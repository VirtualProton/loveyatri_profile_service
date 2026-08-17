export const CustomerProfileGetQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
  description:
    "No query parameters are accepted. Customer id is read from the authenticated bearer token.",
  errorMessage: {
    additionalProperties: "Additional properties are not allowed",
  },
};

export const ResponseSchema = {
  CustomerProfileGetResponseSchema: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["success", "message", "customer"],
      example: {
        success: true,
        message: "Customer details retrieved successfully",
        customer: {
          id: "customer-uuid",
          fullName: "John Doe",
          phone: "919876543210",
          countryCode: "+91",
          isActive: true,
          isProfileComplete: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          CustomerProfile: {
            id: "profile-uuid",
            customerId: "customer-uuid",
            photoUrl: null,
            email: "john@example.com",
            address: "123 Main Street, City, State, 12345",
            city: "Hyderabad",
            state: "Telangana",
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        },
      },
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Customer details retrieved successfully",
        },
        customer: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "fullName",
            "phone",
            "countryCode",
            "isActive",
            "isProfileComplete",
            "createdAt",
            "updatedAt",
            "CustomerProfile",
          ],
          properties: {
            id: { type: "string", example: "customer-uuid" },
            fullName: { type: "string", example: "John Doe" },
            phone: {
              type: "string",
              example: "919876543210",
              description: "Normalized phone number with digits only.",
            },
            countryCode: {
              type: "string",
              example: "+91",
              description: "Customer country calling code.",
            },
            isActive: { type: "boolean", example: true },
            isProfileComplete: { type: "boolean", example: true },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00.000Z",
            },
            CustomerProfile: {
              type: "object",
              nullable: true,
              additionalProperties: false,
              example: null,
              required: [
                "id",
                "customerId",
                "email",
                "address",
                "city",
                "state",
                "createdAt",
                "updatedAt",
              ],
              properties: {
                id: { type: "string", example: "profile-uuid" },
                customerId: { type: "string", example: "customer-uuid" },
                email: {
                  type: "string",
                  format: "email",
                  example: "john@example.com",
                },
                photoUrl: {
                  type: ["string", "null"],
                  example: "https://cdn.example.com/profile.jpg",
                },
                address: {
                  type: ["string", "null"],
                  example: "123 Main Street, City, State, 12345",
                },
                city: {
                  type: ["string", "null"],
                  example: "Hyderabad",
                },
                state: {
                  type: ["string", "null"],
                  example: "Telangana",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-01T00:00:00.000Z",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-01T00:00:00.000Z",
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
