import { ZodObject, ZodSchema, z } from "zod";
import { Prettify } from "../auth/handler.js";
import { Destinations, publish } from "./destination.js";

type Event = {
  type: string;
  $output: any;
  $metadata: any;
  $payload: any;
};

type Target =
  | {
      type: "sst.aws.Bus";
      name: string;
    }
  | {
      type: "sst.aws.Queue";
    };

export function EventClient<
  MetadataFunction extends () => any,
  Validator extends (schema: any) => (input: any) => any,
  MetadataSchema extends Parameters<Validator>[0] | undefined,
>(input: {
  metadata?: MetadataSchema;
  metadataFn?: MetadataFunction;
  validator: Validator;
}) {
  const validator = input.validator;
  const metadataValidator = input.metadata ? validator(input.metadata) : null;
  const fn = function event<
    Type extends string,
    Schema extends Parameters<Validator>[0],
  >(type: Type, schema: Schema) {
    type Payload = Prettify<{
      type: Type;
      properties: Parsed["out"];
      metadata: ReturnType<MetadataFunction>;
    }>;
    type Parsed = inferParser<Schema>;
    type Publish = undefined extends MetadataSchema
      ? (
          destination: Destinations,
          properties: Parsed["in"],
        ) => Promise<Payload>
      : (
          destination: Destinations,
          properties: Parsed["in"],
          // @ts-expect-error
          metadata: inferParser<MetadataSchema>["in"],
        ) => Promise<Payload>;
    type Create = undefined extends MetadataSchema
      ? (properties: Parsed["in"]) => Promise<void>
      : (
          properties: Parsed["in"],
          // @ts-expect-error
          metadata: inferParser<MetadataSchema>["in"],
        ) => Promise<void>;
    const validate = validator(schema);
    async function create(properties: any, metadata?: any) {
      if (metadataValidator) {
        metadata = metadataValidator(metadata);
      }
      if (input.metadataFn) {
        metadata = input.metadataFn();
      }
      properties = validate(properties);
      return {
        type,
        properties,
        metadata,
      };
    }
    async function pub(
      destination: Destinations,
      properties: any,
      metadata?: any,
    ) {
      const payload = await create(properties, metadata);
      return publish(destination, payload);
    }
    return {
      create: create as Create,
      publish: pub as Publish,
      $input: {} as Parsed["in"],
      $output: {} as Parsed["out"],
      $payload: {} as Payload,
      $metadata: {} as ReturnType<MetadataFunction>,
    };
  };
  fn.coerce = <Events extends Event>(
    _events: Events | Events[],
    raw: any,
  ): {
    [K in Events["type"]]: Extract<Events, { type: K }>["$payload"];
  }[Events["type"]] => {
    return raw;
  };
  return fn;
}

export function ZodValidator<Schema extends ZodSchema>(
  schema: Schema,
): (input: z.input<Schema>) => z.output<Schema> {
  return (input) => {
    return schema.parse(input);
  };
}

// Taken from tRPC
export type ParserZodEsque<TInput, TParsedInput> = {
  _input: TInput;
  _output: TParsedInput;
};

export type ParserValibotEsque<TInput, TParsedInput> = {
  _types?: {
    input: TInput;
    output: TParsedInput;
  };
};

export type ParserMyZodEsque<TInput> = {
  parse: (input: any) => TInput;
};

export type ParserSuperstructEsque<TInput> = {
  create: (input: unknown) => TInput;
};

export type ParserCustomValidatorEsque<TInput> = (
  input: unknown,
) => Promise<TInput> | TInput;

export type ParserYupEsque<TInput> = {
  validateSync: (input: unknown) => TInput;
};

export type ParserScaleEsque<TInput> = {
  assert(value: unknown): asserts value is TInput;
};

export type ParserWithoutInput<TInput> =
  | ParserCustomValidatorEsque<TInput>
  | ParserMyZodEsque<TInput>
  | ParserScaleEsque<TInput>
  | ParserSuperstructEsque<TInput>
  | ParserYupEsque<TInput>;

export type ParserWithInputOutput<TInput, TParsedInput> =
  | ParserZodEsque<TInput, TParsedInput>
  | ParserValibotEsque<TInput, TParsedInput>;

export type Parser = ParserWithInputOutput<any, any> | ParserWithoutInput<any>;

export type inferParser<TParser extends Parser> =
  TParser extends ParserWithInputOutput<infer $TIn, infer $TOut>
    ? {
        in: $TIn;
        out: $TOut;
      }
    : TParser extends ParserWithoutInput<infer $InOut>
      ? {
          in: $InOut;
          out: $InOut;
        }
      : never;

export type inferEvent<T extends { shape: ZodObject<any> }> = z.infer<
  T["shape"]
>;

const evt = EventClient({
  validator: ZodValidator,
});
