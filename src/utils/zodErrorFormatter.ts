import { ZodError } from "zod";

export const formatZodFirstError = (error: ZodError) => {
  const issue = error.issues[0]; // 👈 only first error

  return {
    field: issue?.path.join(".") || "body",
    message: issue?.message
  };
};
