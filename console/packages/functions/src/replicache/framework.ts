import { z, ZodAny, ZodObject, ZodRawShape, ZodSchema } from "zod";
import { WriteTransaction } from "replicache";

interface Mutation<Name extends string = string, Input = any> {
  name: Name;
  input: Input;
}

export class Server<Mutations> {
  private mutations = new Map<
    string,
    {
      input: ZodSchema;
      fn: (input: any) => Promise<void>;
    }
  >();

  public mutation<
    Name extends string,
    Shape extends ZodRawShape,
    Args = z.infer<ZodObject<Shape, "strip", ZodAny>>
  >(
    name: Name,
    shape: Shape,
    fn: (input: z.infer<ZodObject<Shape, "strip", ZodAny>>) => Promise<any>
  ): Server<Mutations & { [key in Name]: Mutation<Name, Args> }> {
    this.mutations.set(name as string, {
      fn: async (args) => {
        const parsed = args;
        return fn(parsed);
      },
      input: z.object(shape),
    });
    return this;
  }

  public expose<
    Name extends string,
    Shape extends ZodRawShape,
    Args = z.infer<ZodObject<Shape, "strip", ZodAny>>
  >(
    name: Name,
    fn: ((
      input: z.infer<ZodObject<Shape, "strip", ZodAny>>
    ) => Promise<any>) & {
      schema: {
        shape: Shape;
      };
    }
  ): Server<Mutations & { [key in Name]: Mutation<Name, Args> }> {
    this.mutations.set(name as string, {
      fn,
      input: z.object(fn.schema.shape),
    });
    return this;
  }

  public execute(name: string, args: unknown) {
    const mut = this.mutations.get(name as string);
    if (!mut) throw new Error(`Mutation "${name}" not found`);
    return mut.fn(args);
  }
}

type ExtractMutations<S extends Server<any>> = S extends Server<infer M>
  ? M
  : never;

export class Client<
  S extends Server<any>,
  Mutations extends Record<string, Mutation> = ExtractMutations<S>
> {
  private mutations = new Map<string, (...input: any) => Promise<void>>();

  public mutation<
    Name extends keyof Mutations,
    Input extends ZodRawShape = Mutations[Name]["input"]
  >(name: Name, fn: (tx: WriteTransaction, input: Input) => Promise<void>) {
    this.mutations.set(name as string, fn);
    return this;
  }

  public build(): {
    [key in keyof Mutations]: (
      ctx: WriteTransaction,
      args: Mutations[key]["input"]
    ) => Promise<void>;
  } {
    return Object.fromEntries(this.mutations.entries()) as any;
  }
}
