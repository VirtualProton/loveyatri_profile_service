const platformReviewDataProperties = {
  id: { type: "string", example: "review-uuid" },
  rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
  title: { type: "string", example: "Excellent support" },
  review: {
    type: "string",
    example: "The platform experience was smooth and reliable.",
  },
  isDeleted: { type: "boolean", example: false },
  deletedAt: {
    type: ["string", "null"],
    example: null,
  },
  createdByAdminId: { type: "string", example: "admin-uuid" },
  updatedByAdminId: {
    type: ["string", "null"],
    example: "admin-uuid",
  },
  deletedByAdminId: {
    type: ["string", "null"],
    example: null,
  },
  createdAt: {
    type: "string",
    format: "date-time",
    example: "2026-03-27T08:00:00.000Z",
  },
  updatedAt: {
    type: "string",
    format: "date-time",
    example: "2026-03-27T08:00:00.000Z",
  },
} as const;

const platformReviewDataSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "rating",
    "title",
    "review",
    "isDeleted",
    "deletedAt",
    "createdByAdminId",
    "updatedByAdminId",
    "deletedByAdminId",
    "createdAt",
    "updatedAt",
  ],
  properties: platformReviewDataProperties,
};

export const PlatformReviewParamsSchema = {
  type: "object",
  required: ["reviewId"],
  additionalProperties: false,
  properties: {
    reviewId: {
      type: "string",
      example: "review-uuid",
    },
  },
  errorMessage: {
    required: {
      reviewId: "reviewId is required",
    },
  },
};

export const CreatePlatformReviewBodySchema = {
  type: "object",
  required: ["rating", "title", "review"],
  additionalProperties: false,
  properties: {
    rating: {
      type: "integer",
      minimum: 1,
      maximum: 5,
      example: 5,
      description: "Platform review rating from 1 to 5.",
    },
    title: {
      type: "string",
      minLength: 1,
      maxLength: 255,
      example: "Excellent platform",
    },
    review: {
      type: "string",
      minLength: 1,
      example: "Booking and support experience were very good.",
    },
  },
  errorMessage: {
    required: {
      rating: "rating is required",
      title: "title is required",
      review: "review is required",
    },
    additionalProperties: "Additional properties are not allowed",
  },
};

export const UpdatePlatformReviewBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    rating: {
      type: "integer",
      minimum: 1,
      maximum: 5,
      example: 4,
    },
    title: {
      type: "string",
      minLength: 1,
      maxLength: 255,
      example: "Updated title",
    },
    review: {
      type: "string",
      minLength: 1,
      example: "Updated review content.",
    },
  },
  anyOf: [
    { required: ["rating"] },
    { required: ["title"] },
    { required: ["review"] },
  ],
  errorMessage: {
    anyOf: "At least one field among rating, title, or review must be provided.",
    additionalProperties: "Additional properties are not allowed",
  },
};

export const PlatformReviewResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["success", "message", "data"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Platform review updated successfully." },
      data: platformReviewDataSchema,
    },
  },
  201: {
    type: "object",
    additionalProperties: false,
    required: ["success", "message", "data"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Platform review created successfully." },
      data: platformReviewDataSchema,
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
        example: "rating must be an integer between 1 and 5.",
      },
    },
  },
  401: {
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Authentication required" },
    },
  },
  403: {
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Admin access required" },
    },
  },
  404: {
    type: "object",
    additionalProperties: false,
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Platform review not found." },
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
        example: "Failed to save platform review.",
      },
    },
  },
};

export const DeletePlatformReviewResponseSchema = {
  200: {
    type: "object",
    additionalProperties: false,
    required: ["success", "message", "data"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Platform review deleted successfully." },
      data: platformReviewDataSchema,
    },
  },
  401: PlatformReviewResponseSchema[401],
  403: PlatformReviewResponseSchema[403],
  404: PlatformReviewResponseSchema[404],
  500: PlatformReviewResponseSchema[500],
};
