import { ZodError, ZodSchema } from "zod";
export * as Validate from "./validate";

export function assert(schema: ZodSchema<any, any, any>, value: any): void {
  try {
    schema.parse(value);
  } catch (ex) {
    if (ex instanceof ZodError) {
      const message = ["Input props error"];
      const issues = ex.issues.flatMap((issue) => {
        if (issue.code === "invalid_union")
          return issue.unionErrors.flatMap((x) => x.issues);
        return [issue];
      });

      for (const issue of issues) {
        message.push("-> " + issue.path.join(".") + ": " + issue.message);
      }
      throw new Error(message.join("\n"));
    }
    throw ex;
  }
}
