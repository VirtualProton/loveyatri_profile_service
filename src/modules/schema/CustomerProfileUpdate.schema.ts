export const CustomerProfileUpdateSchema = {
  type: "object",
  additionalProperties: false,

  description:
    "Update customer profile details.\n\n" +
    "Rules:\n" +
    "- Requires a valid access token; customer id is read from the JWT.\n" +
    "- You may update `fullName`, `photoUrl`, `address`, `city`, `state`, or `countryCode` directly.\n" +
    "- To change email, provide a new `email`. A verification link will be generated.\n" +
    "- To change phone, provide `verificationToken` from the phone OTP verification flow.",

  properties: {
    fullName: {
      type: ["string", "null"],
      example: "John Doe",
      description:
        "Updated full name. This updates the `Customer.fullName` field.",
    },

    photoUrl: {
      type: ["string", "null"],
      format: "uri",
      example: "https://cdn.example.com/profile.jpg",
      description: "Updated profile image URL. Must be a valid URI.",
    },

    address: {
      type: ["string", "null"],
      example: "123 Main Street, Hyderabad, Telangana, 500001",
      description: "Updated address. Pass `null` to clear the address.",
    },

    city: {
      type: ["string", "null"],
      example: "Hyderabad",
      description: "Updated city. Pass `null` to clear the city.",
    },

    state: {
      type: ["string", "null"],
      example: "Telangana",
      description: "Updated state. Pass `null` to clear the state.",
    },

    email: {
      type: ["string", "null"],
      format: "email",
      example: "newemail@example.com",
      description:
        "New profile email address. A verification link is generated and must be confirmed before applying the change.",
    },

    countryCode: {
      type: ["string", "null"],
      example: "+91",
      description:
        "Customer country calling code. Empty strings and null are ignored.",
    },

    verificationToken: {
      type: ["string", "null"],
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc1ZlcmlmaWVkIjp0cnVlLCJwaG9uZSI6IjkxOTg3NjU0MzIxMCJ9.signature",
      description:
        "JWT issued after phone OTP verification. The token payload must include `isVerified: true` and `phone`.",
    },

    phoneVerificationToken: {
      type: ["string", "null"],
      description:
        "Deprecated alias for `verificationToken`. Use `verificationToken` for new clients.",
    },
  },

  anyOf: [
    { required: ["fullName"] },
    { required: ["photoUrl"] },
    { required: ["address"] },
    { required: ["city"] },
    { required: ["state"] },
    { required: ["email"] },
    { required: ["countryCode"] },
    { required: ["verificationToken"] },
    { required: ["phoneVerificationToken"] },
  ],

  not: {
    required: ["verificationToken", "phoneVerificationToken"],
  },

  errorMessage: {
    anyOf: "At least one updatable field must be provided.",
    not: "Use either verificationToken or phoneVerificationToken, not both.",
    properties: {
      email: "email must be a valid email address",
      photoUrl: "photoUrl must be a valid URI",
    },
    additionalProperties: "Additional properties are not allowed",
  },
};

export const ResponseSchema = {
  CustomerProfileUpdateResponseSchema: {
    200: {
      description:
        "Customer profile updated successfully.\n\n" +
        "- If profile info is changed, returns the updated customer.\n" +
        "- If email is changed, an email verification link is generated and returned.\n" +
        "- If phone is changed via `verificationToken`, the phone is updated immediately.",

      type: "object",
      additionalProperties: false,
      required: [
        "success",
        "message",
        "emailVerificationRequired",
        "emailChangeLink",
        "phoneChanged",
        "customer",
      ],

      properties: {
        success: { type: "boolean", example: true },

        message: {
          type: "string",
          example: "Customer profile updated successfully.",
        },

        emailVerificationRequired: {
          type: "boolean",
          example: false,
          description:
            "True when email was changed and verification via email link is required.",
        },

        emailChangeLink: {
          type: ["string", "null"],
          example: null,
          description:
            "Email verification link. Non-null only when a new email was requested.",
        },

        phoneChanged: {
          type: "boolean",
          example: false,
          description:
            "True if the phone number was updated using a verified phone token.",
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

            CustomerProfile: {
              type: ["object", "null"],
              additionalProperties: false,
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
                  example: "2026-02-23T06:20:15.000Z",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  example: "2026-02-23T06:30:45.000Z",
                },
              },
            },
          },
        },
      },
    },

    403: {
      description:
        "Forbidden when attempting to change email for an inactive account.",
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
      description:
        "Not found customer or customer profile does not exist for the given customerId.",
      type: "object",
      additionalProperties: false,
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
      description:
        "Conflict returned when trying to use an email or phone that already belongs to another customer.",
      type: "object",
      additionalProperties: false,
      required: ["success", "message"],
      properties: {
        success: { type: "boolean", example: false },
        message: {
          type: "string",
          example:
            "Email already in use by another customer / Phone number already in use by another customer",
        },
      },
    },

    500: {
      description: "Unexpected server error while updating the customer profile.",
      type: "object",
      additionalProperties: false,
      required: ["success", "message"],
      properties: {
        success: { type: "boolean", example: false },
        message: {
          type: "string",
          example: "Customer profile update failed",
        },
      },
    },
  },
};
