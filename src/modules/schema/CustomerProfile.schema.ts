export const CustomerProfileSchema = {
  type: "object",
  required: ["customerId", "photoUrl", "verificationToken"],
  additionalProperties: false,

  properties: {
    customerId: {
      type: "string",
      example: "a1b2c3d4-uuid",
      description:
        "Customer ID (primary key of Customer). The authenticated customer for whom the profile is being created.",
    },

    photoUrl: {
      type: "string",
      format: "uri",
      example: "https://cdn.example.com/profile-images/john-doe.jpg",
      description:
        "Public URL of the customer's profile photo. Must be a valid URI.",
    },

    verificationToken: {
      type: "string",
      description:
        "JWT token issued after successful phone number verification.\n" +
        "This token encodes `isVerified` and the normalized phone number (with country code, e.g. `919876543210`).\n" +
        "If missing, invalid, or expired, the request will be rejected.",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc1ZlcmlmaWVkIjp0cnVlLCJwaG9uZSI6IjkxOTg3NjU0MzIxMCJ9.signature",
    },

    address: {
      type: "string",
      nullable: true,
      example: "123 Main Street, Hyderabad, Telangana, 500001",
      description: "Optional address of the customer. Can be left empty.",
    },
  },

  errorMessage: {
    required: {
      customerId: "customerId is required",
      photoUrl: "photoUrl is required",
      verificationToken: "verificationToken (phone verification token) is required",
    },
    additionalProperties: "Additional properties are not allowed in the request body",
  },
};



export const CustomerProfileResponseSchema = {
  200: {
    description:
      "Customer profile created successfully.\n\n" +
      "- Phone number is taken from the verified token and stored as unique `phone`.\n" +
      "- `countryCode` defaults to '+91' if not provided.\n" +
      "- Customer is marked as `isProfileComplete = true` and `isActive = true`.",

    type: "object",
    additionalProperties: false,
    required: ["success", "message", "profile"],

    properties: {
      success: {
        type: "boolean",
        example: true,
        description: "Indicates whether the request was successful.",
      },

      message: {
        type: "string",
        example: "Customer profile created successfully.",
        description: "Human-readable message describing the result.",
      },

      profile: {
        type: "object",
        description: "Newly created customer profile with linked customer summary.",
        additionalProperties: false,
        required: [
          "id",
          "customerId",
          "fullName",
          "photoUrl",
          "phone",
          "countryCode",
          "address",
          "createdAt",
          "updatedAt",
          "Customer",
        ],
        properties: {
          id: {
            type: "string",
            example: "profile-uuid",
            description: "Profile ID (UUID).",
          },

          customerId: {
            type: "string",
            example: "customer-uuid",
            description: "Customer ID this profile belongs to.",
          },

          fullName: {
            type: "string",
            example: "John Doe",
            description: "Customer's full name as stored in the profile.",
          },

          photoUrl: {
            type: "string",
            example: "https://cdn.example.com/profile-images/john-doe.jpg",
            description: "URL of the profile picture.",
          },

          phone: {
            type: "string",
            example: "919876543210",
            description:
              "Normalized phone number including country code, stored as unique for the profile.",
          },

          countryCode: {
            type: ["string", "null"],
            example: "+91",
            description:
              "Country dialing code. Defaults to '+91' if not explicitly set.",
          },

          address: {
            type: ["string", "null"],
            example: "123 Main Street, Hyderabad, Telangana, 500001",
            description: "Optional customer address.",
          },

          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-02-23T06:20:15.000Z",
            description: "ISO timestamp when the profile was created.",
          },

          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-02-23T06:20:15.000Z",
            description: "ISO timestamp when the profile was last updated.",
          },

          Customer: {
            type: "object",
            description:
              "Minimal customer data joined from the Customer table (via Prisma `include`).",
            additionalProperties: false,
            required: ["fullName", "email"],
            properties: {
              fullName: {
                type: "string",
                example: "John Doe",
                description: "Customer's full name from the Customer table.",
              },
              email: {
                type: ["string", "null"],
                example: "john@example.com",
                description:
                  "Customer's email from the Customer table. May be null in some cases.",
              },
            },
          },
        },
      },
    },
  },

  400: {
    description:
      "Bad request – validation failed or phone verification token is invalid/expired.\n\n" +
      "Returned when:\n" +
      "- Required fields are missing.\n" +
      "- `verificationToken` is missing, invalid, or expired.\n" +
      "- Token payload is malformed.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example: "Phone verification token has expired. Please verify your phone number again.",
      },
    },
  },

  404: {
    description: "Customer not found for the given customerId.",
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
      "Conflict – profile or phone number already used.\n\n" +
      "Returned when:\n" +
      "- Customer already has a profile.\n" +
      "- Phone number (from token) is already linked to another profile.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example:
          "Profile already completed." +
          " / " +
          "Phone number already in use.",
      },
    },
  },

  500: {
    description:
      "Unexpected server or database error while creating the profile. " +
      "Caller should retry or contact support if it persists.",
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example:
          "Customer profile creation failed. Please try again later.",
      },
    },
  },
};
