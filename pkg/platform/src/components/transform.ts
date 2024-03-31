import { runtime } from "@pulumi/pulumi";

export function $transform<T, Args, Options>(
  resource: { new (name: string, args: Args, opts?: Options): T },
  cb: (args: Args, opts: Options) => void,
) {
  // @ts-expect-error
  const type = resource.__pulumiType;
  runtime.registerStackTransformation((input) => {
    if (input.type !== type) return;
    cb(input.props as any, input.opts as any);
    return input;
  });
}
