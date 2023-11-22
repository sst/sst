import { FunctionCodeUpdater } from "./function-code-updater";

export interface FunctionArgs
  extends Omit<
    aws.lambda.FunctionArgs,
    "code" | "s3Bucket" | "s3Key" | "role"
  > {
  bundle: string;
  bundleHash: string;
  policies: aws.types.input.iam.RoleInlinePolicy[];
}

export class Function extends util.ComponentResource {
  public readonly name: util.Output<string>;
  constructor(
    name: string,
    args: FunctionArgs,
    opts?: util.ComponentResourceOptions
  ) {
    super("sst:sst:Function", name, args, opts);

    const { bundle, policies } = args;

    const role = new aws.iam.Role(
      `${name}-role`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
        inlinePolicies: policies,
        managedPolicyArns: [
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        ],
      },
      { parent: this }
    );

    const file = new aws.s3.BucketObjectv2(
      `${name}-code`,
      {
        key: `${name}-code-${args.bundleHash}.zip`,
        bucket: app.bootstrap.bucket,
        source: new util.asset.FileArchive(bundle),
      },
      { parent: this }
    );
    const fn = new aws.lambda.Function(
      `${name}-function`,
      {
        code: new util.asset.AssetArchive({
          index: new util.asset.StringAsset("exports.handler = () => {}"),
        }),
        role: role.arn,
        ...args,
      },
      { parent: this }
    );

    new FunctionCodeUpdater(`${name}-code-updater`);
    //    new FunctionCodeUpdater(`${name}-code-updater`, {
    //      functionName: fn.name,
    //      s3Bucket: file.bucket,
    //      s3Key: file.key,
    //    });

    this.name = fn.name;
  }
}
