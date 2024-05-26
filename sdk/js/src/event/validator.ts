import { ZodSchema, z } from "zod";

export function ZodValidator<Schema extends ZodSchema>(
  schema: Schema,
): (input: z.input<Schema>) => z.output<Schema> {
  return (input) => {
    return schema.parse(input);
  };
}

import { BaseSchema, parse, Input } from "valibot";

export function ValibotValidator<T extends BaseSchema>(schema: T) {
  return (value: Input<T>) => {
    return parse(schema, value);
  };
}
