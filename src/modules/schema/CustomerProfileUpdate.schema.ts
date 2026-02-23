export const CustomerProfileUpdateSchema = {
  type: "object",
  required: ["customerId"],
  additionalProperties: false,

  description:
    "Update customer profile details.\n\n" +
    "Rules:\n" +
    "- `customerId` is required.\n" +
    "- You may update `fullName`, `photoUrl`, or `address` directly.\n" +
    "- To change email, provide a new `email`. A verification link will be generated.\n" +
    "- To change phone, provide a valid `verificationToken` issued after OTP verification.\n" +
    "- Email and phone cannot be updated in the same request.",

  properties: {
    customerId: {
      type: "string",
      example: "a1b2c3d4-uuid",
      description: "Customer ID (primary key of Customer table).",
    },

    fullName: {
      type: "string",
      example: "John Doe",
      description:
        "Updated full name. This updates both Customer and CustomerProfile.",
    },

    photoUrl: {
      type: "string",
      format: "uri",
      example: "https://cdn.example.com/profile.jpg",
      description:
        "Updated profile image URL. Must be a valid URI.",
    },

    address: {
      type: ["string", "null"],
      example: "123 Main Street, Hyderabad, Telangana, 500001",
      description:
        "Updated address. Pass `null` to clear the address.",
    },

    email: {
      type: "string",
      format: "email",
      example: "newemail@example.com",
      description:
        "New email address.\n" +
        "- Must be unique.\n" +
        "- Account must be active.\n" +
        "- A verification link will be generated and must be confirmed before applying the change.",
    },

    verificationToken: {
      type: "string",
      description:
        "JWT token issued after successful phone OTP verification.\n" +
        "- Used to update phone number.\n" +
        "- Must contain `{ isVerified: true, phone: <normalizedPhone> }`.\n" +
        "- Cannot be used together with `email` in the same request.",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc1ZlcmlmaWVkIjp0cnVlLCJwaG9uZSI6IjkxOTg3NjU0MzIxMCJ9.signature",
    },
  },

  errorMessage: {
    required: {
      customerId: "customerId is required",
    },
    properties: {
      email: "email must be a valid email address",
      photoUrl: "photoUrl must be a valid URI",
    },
    additionalProperties: "Additional properties are not allowed",
  },
};

// src/modules/schemas/customer/profile/customerProfileUpdate.response.schema.ts

export const ResponseSchema = {
  CustomerProfileUpdateResponseSchema: {
    200: {
      description:
        "Customer profile updated successfully.\n\n" +
        "Behaviours:\n" +
        "- If only profile info (name / photo / address) is changed → returns updated customer.\n" +
        "- If email is changed → an email-change verification link is generated and returned.\n" +
        "- If phone is changed (via verificationToken) → phone is updated immediately.",

      type: "object",
      additionalProperties: false,
      required: ["success", "message", "customer"],

      properties: {
        success: { type: "boolean", example: true },

        message: {
          type: "string",
          example: "Customer profile updated successfully.",
          description:
            "Human-readable message. May indicate if email or phone change was performed.",
        },

        // Present when email change flow was triggered
        emailChangeLink: {
          type: ["string", "null"],
          example: null,
          description:
            "Email change verification link. Non-null only when a new email was requested.",
        },

        // True if phone number was updated using a verified token
        phoneChanged: {
          type: "boolean",
          example: false,
          description:
            "Indicates whether the phone number was updated in this request.",
        },

        customer: {
          type: "object",
          description:
            "Updated customer entity with attached CustomerProfile (if present).",
          additionalProperties: false,
          required: [
            "id",
            "fullName",
            "email",
            "pendingEmail",
            "isActive",
            "isProfileComplete",
          ],
          properties: {
            id: { type: "string", example: "customer-uuid" },

            fullName: {
              type: "string",
              example: "John Doe",
              description: "Customer's full name.",
            },

            email: {
              type: ["string", "null"],
              example: "john@example.com",
              description:
                "Primary email of the customer. May remain unchanged if email verification is pending.",
            },

            pendingEmail: {
              type: ["string", "null"],
              example: "newemail@example.com",
              description:
                "Pending new email, if your flow uses it. May be null.",
            },

            isActive: {
              type: "boolean",
              example: true,
              description: "Indicates whether the customer account is active.",
            },

            isProfileComplete: {
              type: "boolean",
              example: true,
              description:
                "Indicates whether the customer has completed their profile.",
            },

            // Nested CustomerProfile from Prisma include
            CustomerProfile: {
              type: ["object", "null"],
              description:
                "Profile details for this customer. Null if profile does not exist.",
              additionalProperties: false,
              properties: {
                id: {
                  type: "string",
                  example: "profile-uuid",
                  description: "Profile ID.",
                },

                customerId: {
                  type: "string",
                  example: "customer-uuid",
                  description: "Customer ID this profile belongs to.",
                },

                fullName: {
                  type: "string",
                  example: "John Doe",
                  description: "Full name as stored in the profile.",
                },

                phone: {
                  type: ["string", "null"],
                  example: "919876543210",
                  description:
                    "Normalized phone number with country code. May be null if not set.",
                },

                photoUrl: {
                  type: ["string", "null"],
                  example: "https://cdn.example.com/profile.jpg",
                  description: "Profile picture URL.",
                },

                countryCode: {
                  type: ["string", "null"],
                  example: "+91",
                  description:
                    "Country dialing code. Defaults to '+91' if not set.",
                },

                address: {
                  type: ["string", "null"],
                  example: "123 Main Street, City, State, 12345",
                  description: "Customer address stored in the profile.",
                },

                createdAt: {
                  type: "string",
                  format: "date-time",
                  example: "2026-02-23T06:20:15.000Z",
                  description: "Profile creation timestamp.",
                },

                updatedAt: {
                  type: "string",
                  format: "date-time",
                  example: "2026-02-23T06:30:45.000Z",
                  description: "Last profile update timestamp.",
                },
              },
            },
          },
        },
      },
    },

    403: {
      description:
        "Forbidden – typically returned when attempting to change email for an inactive account.",
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
        "Not found – customer or customer profile does not exist for the given customerId.",
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
        "Conflict – returned when trying to use an email or phone that already belongs to another customer.",
      type: "object",
      additionalProperties: false,
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
      description:
        "Unexpected server error while updating the customer profile.",
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
