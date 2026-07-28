import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export function validate(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        field:
          issue.path.slice(1).join(".") ||
          issue.path.join("."),
        message: issue.message
      }));

      res.status(400).json({
        success: false,
        message: "Validation failed",
        errorDetails
      });

      return;
    }

    res.locals.validated = result.data;

    next();
  };
}