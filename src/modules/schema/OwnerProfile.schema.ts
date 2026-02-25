export const OwnerProfileBodySchema = {
    type: "object",
    required: ["adminId", "photoUrl", "preferredLanguage", "phoneVerificationToken"],
    additionalProperties: false,

    description:
        "Complete owner profile after phone verification.\n\n" +
        "Notes:\n" +
        "- `phoneVerificationToken` must be obtained after successful OTP verification.\n" +
        "- If `isGstRegistered` is true, GST fields become mandatory.\n" +
        "- `countryCode` is optional. If omitted, default '+91' will be used.",

    properties: {
        adminId: {
            type: "string",
            example: "a1b2c3d4-uuid",
            description: "Admin ID (FK to Admin table). Typically sourced from JWT.",
        },

        photoUrl: {
            type: "string",
            format: "uri",
            example: "https://example.com/profile.jpg",
            description: "Public URL of the owner's profile picture.",
        },

        preferredLanguage: {
            type: "string",
            enum: ["EN", "HI", "TE"],
            example: "EN",
            description: "Preferred language code for communication.",
        },

        shortBio: {
            type: "string",
            nullable: true,
            example: "Experienced property owner and manager.",
            description: "Short description/bio of the owner.",
        },

        // 🔐 Phone verification token (JWT from OTP verification step)
        phoneVerificationToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            description:
                "JWT issued after successful phone OTP verification. Encodes normalized phone and verification flag.",
        },

        // 🔽 Optional fields

        countryCode: {
            type: "string",
            nullable: true,
            example: "+91",
            description:
                "Country code for the phone number. Optional. If not provided, default '+91' will be applied.",
        },

        isGstRegistered: {
            type: "boolean",
            example: false,
            description:
                "Indicates whether the owner is GST registered. If true, GST fields become mandatory.",
        },

        gstNumber: {
            type: "string",
            nullable: true,
            example: "29ABCDE1234F1Z5",
            description:
                "15-character GSTIN. Required if `isGstRegistered` is true.",
        },

        gstLegalName: {
            type: "string",
            nullable: true,
            example: "ABC Properties Private Limited",
            description:
                "Legal name as per GST certificate. Required if `isGstRegistered` is true.",
        },

        gstStateCode: {
            type: "string",
            nullable: true,
            example: "29",
            description:
                "2-digit GST state code. Required if `isGstRegistered` is true.",
        },

        gstBillingAddress: {
            type: "string",
            nullable: true,
            example: "123 MG Road, Bengaluru, Karnataka",
            description:
                "Billing address printed on tax invoice. Required if `isGstRegistered` is true.",
        },

        pincode: {
            type: "string",
            nullable: true,
            example: "560001",
            description: "Postal/ZIP code of the billing address.",
        },
    },

    // 🔁 Conditional requirement: if isGstRegistered === true => GST fields required
    allOf: [
        {
            if: {
                properties: {
                    isGstRegistered: { const: true },
                },
                required: ["isGstRegistered"],
            },
            then: {
                required: ["gstNumber", "gstLegalName", "gstStateCode", "gstBillingAddress"],
            },
        },
    ],

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
            countryCode:
                "countryCode must be a valid format like +91, +1, etc.",
        },
        additionalProperties: "Additional properties are not allowed",
    },
};



export const OwnerProfileUpdateSchema = {
  type: "object",
  required: ["adminId"],
  additionalProperties: false,

  description:
    "Update owner profile.\n\n" +
    "Rules:\n" +
    "- At least one updatable field must be provided.\n" +
    "- Cannot update email and phone together.\n" +
    "- If `isGstRegistered` is true, GST fields become mandatory.\n" +
    "- Optional fields support `null` to explicitly clear values.",

  properties: {
    adminId: {
      type: "string",
      example: "a1b2c3d4-uuid",
      description: "Admin ID (FK to Admin table)",
    },

    // 🔹 Admin fields
    fullName: {
      type: ["string", "null"],
      minLength: 2,
      example: "Rahul Sharma",
    },

    email: {
      type: ["string", "null"],
      format: "email",
      example: "rahul.sharma@example.com",
      description:
        "Changing email triggers verification flow. Cannot change email and phone together.",
    },

    // 🔹 AdminProfile fields
    photoUrl: {
      type: ["string", "null"],
      format: "uri",
      example: "https://example.com/profile.jpg",
    },

    preferredLanguage: {
      type: ["string", "null"],
      enum: ["EN", "HI", "TE"],
      example: "EN",
    },

    shortBio: {
      type: ["string", "null"],
      example: "Experienced property owner and manager.",
      description:
        "Send null to clear short bio.",
    },

    // 🔐 Phone change via OTP verification token
    phoneVerificationToken: {
      type: ["string", "null"],
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      description:
        "JWT issued after successful phone OTP verification. Cannot be used together with email change.",
    },

    // 🔽 Additional profile fields

    countryCode: {
      type: ["string", "null"],
      example: "+91",
      description:
        "Country calling code. Null will be ignored (non-nullable column).",
    },

    isGstRegistered: {
      type: ["boolean", "null"],
      example: true,
      description:
        "Enable or disable GST registration. If true, GST fields are required.",
    },

    gstNumber: {
      type: ["string", "null"],
      example: "29ABCDE1234F1Z5",
      description:
        "15-character GSTIN. Required if isGstRegistered = true.",
    },

    gstLegalName: {
      type: ["string", "null"],
      example: "ABC Properties Pvt Ltd",
    },

    gstStateCode: {
      type: ["string", "null"],
      example: "29",
      description: "2-digit GST state code.",
    },

    gstBillingAddress: {
      type: ["string", "null"],
      example: "123 MG Road, Bengaluru",
    },

    pincode: {
      type: ["string", "null"],
      example: "560001",
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
    { required: ["countryCode"] },
    { required: ["isGstRegistered"] },
    { required: ["gstNumber"] },
    { required: ["gstLegalName"] },
    { required: ["gstStateCode"] },
    { required: ["gstBillingAddress"] },
    { required: ["pincode"] },
  ],

  /**
   * ❌ Prevent email + phone together
   */
  not: {
    required: ["email", "phoneVerificationToken"],
  },

  /**
   * 🔁 Conditional GST requirement
   */
  allOf: [
    {
      if: {
        properties: {
          isGstRegistered: { const: true },
        },
        required: ["isGstRegistered"],
      },
      then: {
        required: [
          "gstNumber",
          "gstLegalName",
          "gstStateCode",
        ],
      },
    },
  ],

  errorMessage: {
    required: {
      adminId: "adminId is required",
    },
    anyOf:
      "At least one updatable field must be provided.",
    not:
      "You cannot update email and phone at the same time.",
    properties: {
      email: "email must be a valid email address",
      preferredLanguage:
        "preferredLanguage must be one of EN, HI, or TE",
      gstNumber:
        "gstNumber must be a valid 15-character GSTIN",
      gstStateCode:
        "gstStateCode must be a 2-digit numeric code",
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
            required: ["success", "message", "data"],
            properties: {
                success: { type: "boolean", example: true },
                message: {
                    type: "string",
                    example: "Owner profile completed successfully.",
                },
                data: {
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
                            example: "919876543210", // normalized with country code digits
                            description:
                                "Phone number normalized as digits (including country code, without '+').",
                        },
                        countryCode: {
                            type: "string",
                            example: "+91",
                            description: "Country calling code stored for this profile.",
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

                        // GST / billing fields (all optional / nullable)
                        isGstRegistered: {
                            type: "boolean",
                            example: false,
                        },
                        gstNumber: {
                            type: ["string", "null"],
                            example: "29ABCDE1234F1Z5",
                        },
                        gstLegalName: {
                            type: ["string", "null"],
                            example: "ABC Properties Private Limited",
                        },
                        gstStateCode: {
                            type: ["string", "null"],
                            example: "29",
                        },
                        gstBillingAddress: {
                            type: ["string", "null"],
                            example: "123 MG Road, Bengaluru, Karnataka",
                        },
                        pincode: {
                            type: ["string", "null"],
                            example: "560001",
                        },

                        createdAt: {
                            type: "string",
                            format: "date-time",
                            example: "2026-02-25T05:30:00.000Z",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            example: "2026-02-25T05:30:00.000Z",
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
                        "Phone number is not verified - please verify first before completing the profile.",
                    // Other possible messages from service:
                    // - "Admin ID is required."
                    // - "Photo URL is required."
                    // - "Preferred language is required."
                    // - "GST number is required when GST registration is enabled."
                },
            },
        },

        404: {
            type: "object",
            additionalProperties: false,
            required: ["success", "message"],
            properties: {
                success: { type: "boolean", example: false },
                message: { type: "string", example: "Owner not found." },
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
                    example: "Profile is already completed.",
                    // Other possible messages from service:
                    // - "Profile already exists for this owner. Please edit the existing profile."
                    // - "Phone number is already in use."
                    // - "GST number is already linked to another profile."
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
                    example: "Something went wrong while completing owner profile.",
                    // Other possible messages from service (wrapped as AppError 500):
                    // - "Owner profile creation failed: Unknown error"
                    // - "Database error while creating owner profile."
                },
            },
        },
    },
UpdateOwnerProfileResponseSchema : {
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
        description:
          "Message varies based on what was updated (email link sent / phone updated / other fields).",
      },

      emailVerificationRequired: {
        type: "boolean",
        example: false,
        description:
          "True if email was changed and verification via email link is required.",
      },

      emailChangeLink: {
        type: ["string", "null"],
        example: null,
        description:
          "Email verification link (present only if emailVerificationRequired is true).",
      },

      phoneChanged: {
        type: "boolean",
        example: false,
        description:
          "True if the phone number was updated using phoneVerificationToken.",
      },

      owner: {
        type: "object",
        additionalProperties: false,
        required: ["id", "fullName", "email", "isActive", "isProfileComplete", "profile"],
        properties: {
          id: { type: "string", example: "admin-uuid" },
          fullName: { type: "string", example: "John Owner" },
          email: { type: "string", format: "email", example: "owner@example.com" },

          isActive: { type: "boolean", example: true },
          isProfileComplete: { type: "boolean", example: true },

          profile: {
            type: ["object", "null"],
            description:
              "Owner profile details. Null if profile has not been created yet.",
            additionalProperties: false,
            required: ["id", "adminId", "photoUrl", "phone", "countryCode", "preferredLanguage", "isGstRegistered", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string", example: "profile-uuid" },
              adminId: { type: "string", example: "admin-uuid" },

              photoUrl: {
                type: "string",
                example: "https://cdn.example.com/profile.jpg",
                description: "Profile photo URL (non-null in DB).",
              },

              phone: {
                type: "string",
                example: "919876543210",
                description:
                  "Normalized phone number with country code digits (no '+').",
              },

              countryCode: {
                type: "string",
                example: "+91",
                description: "Country calling code (non-null in DB).",
              },

              preferredLanguage: {
                type: "string",
                enum: ["EN", "HI", "TE"],
                example: "EN",
              },

              shortBio: {
                type: ["string", "null"],
                example: "Experienced property owner",
              },

              commissionPercentOverride: {
                type: ["number", "null"],
                example: null,
                description:
                  "Optional commission override (if used by business logic).",
              },

              // GST fields
              isGstRegistered: { type: "boolean", example: false },

              gstNumber: {
                type: ["string", "null"],
                example: "29ABCDE1234F1Z5",
                description: "15-character GSTIN (unique).",
              },

              gstLegalName: {
                type: ["string", "null"],
                example: "ABC Properties Private Limited",
              },

              gstStateCode: {
                type: ["string", "null"],
                example: "29",
                description: "2-digit GST state code.",
              },

              gstBillingAddress: {
                type: ["string", "null"],
                example: "123 MG Road, Bengaluru, Karnataka",
              },

              pincode: {
                type: ["string", "null"],
                example: "560001",
              },

              createdAt: {
                type: "string",
                format: "date-time",
                example: "2026-02-25T05:30:00.000Z",
              },

              updatedAt: {
                type: "string",
                format: "date-time",
                example: "2026-02-25T05:30:00.000Z",
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
          "Email already in use / Phone number already in use by another owner / GST number is already linked to another profile",
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