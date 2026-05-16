export const CustomerProfileSchema = {
  type: "object",
  required: ["photoUrl", "email"],
  additionalProperties: false,

  properties: {
    photoUrl: {
      type: "string",
      format: "uri",
      example: "https://cdn.example.com/profile-images/john-doe.jpg",
      description:
        "Public URL of the customer's profile photo. Must be a valid URI.",
    },

    email: {
      type: "string",
      format: "email",
      example: "john@example.com",
      description:
        "Customer profile email. A verification link is generated for this address.",
    },

    address: {
      type: "string",
      nullable: true,
      example: "123 Main Street, Hyderabad, Telangana, 500001",
      description: "Optional address of the customer. Can be left empty.",
    },

    city: {
      type: "string",
      nullable: true,
      example: "Hyderabad",
      description: "Optional city for the customer profile.",
    },

    state: {
      type: "string",
      nullable: true,
      example: "Telangana",
      description: "Optional state for the customer profile.",
    },
  },

  errorMessage: {
    required: {
      photoUrl: "photoUrl is required",
      email: "email is required",
    },
    properties: {
      email: "email must be a valid email address",
      photoUrl: "photoUrl must be a valid URI",
    },
    additionalProperties:
      "Additional properties are not allowed in the request body",
  },
};

export const CustomerProfileResponseSchema = {
  200: {
    description:
      "Customer profile created successfully. Email verification link is generated for the provided email address.",

    type: "object",
    additionalProperties: false,
    required: ["success", "message", "profile", "emailChangeLink"],

    properties: {
      success: {
        type: "boolean",
        example: true,
      },

      message: {
        type: "string",
        example:
          "Customer profile created successfully. Email verification link sent to the email address.",
      },

      emailChangeLink: {
        type: "string",
        example:
          "https://api.example.com/verify-email-change?token=verification-token",
        description: "Email verification link for the created profile email.",
      },

      profile: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "customerId",
          "photoUrl",
          "email",
          "address",
          "city",
          "state",
          "createdAt",
          "updatedAt",
          "Customer",
        ],
        properties: {
          id: { type: "string", example: "profile-uuid" },
          customerId: { type: "string", example: "customer-uuid" },
          photoUrl: {
            type: "string",
            example: "https://cdn.example.com/profile-images/john-doe.jpg",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          address: {
            type: ["string", "null"],
            example: "123 Main Street, Hyderabad, Telangana, 500001",
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
            example: "2026-02-23T06:20:15.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-02-23T06:20:15.000Z",
          },
          Customer: {
            type: "object",
            additionalProperties: false,
            required: ["fullName", "isActive"],
            properties: {
              fullName: { type: "string", example: "John Doe" },
              isActive: { type: "boolean", example: false },
            },
          },
        },
      },
    },
  },

  400: {
    description:
      "Bad request validation failed, usually because required fields are missing or email is invalid.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example: "Email is required.",
      },
    },
  },

  404: {
    description: "Customer not found for the authenticated customer id.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Customer not found." },
    },
  },

  409: {
    description:
      "Conflict returned when the customer already has a profile or the email is already used.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example: "Profile already completed. / Email already in use.",
      },
    },
  },

  500: {
    description:
      "Unexpected server or database error while creating the profile.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example: "Customer profile creation failed. Please try again later.",
      },
    },
  },
};
