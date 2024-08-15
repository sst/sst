import {
  ComponentResource,
  ComponentResourceOptions,
  Inputs,
  runtime,
  output,
} from "@pulumi/pulumi";
import { physicalName } from "./naming.js";
import { VisibleError } from "./error.js";
import { getRegionOutput } from "@pulumi/aws";

/**
 * Helper type to inline nested types
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Transform<T> =
  | Partial<T>
  | ((args: T, opts: $util.CustomResourceOptions, name: string) => undefined);
export function transform<T extends object>(
  transform: Transform<T> | undefined,
  name: string,
  args: T,
  opts: $util.CustomResourceOptions,
) {
  // Case: transform is a function
  if (typeof transform === "function") {
    transform(args, opts, name);
    return [name, args, opts] as const;
  }

  // Case: no transform
  // Case: transform is an argument
  return [name, { ...args, ...transform }, opts] as const;
}

export class Component extends ComponentResource {
  constructor(
    type: string,
    name: string,
    args?: Inputs,
    opts?: ComponentResourceOptions,
    _version: number = 1,
  ) {
    const transforms = ComponentTransforms.get(type) ?? [];
    for (const transform of transforms) {
      transform({ props: args, opts });
    }
    super(type, name, args, {
      transformations: [
        // Ensure logical and physical names are prefixed
        (args) => {
          // Ensure names are prefixed with parent's name
          if (
            args.type !== type &&
            // @ts-expect-error
            !args.name.startsWith(args.opts.parent!.__name)
          ) {
            throw new Error(
              `In "${name}" component, the logical name of "${args.name}" (${args.type}) is not prefixed with parent's name`,
            );
          }

          // Ensure physical names are prefixed with app/stage
          // note: We are setting the default names here instead of inline when creating
          //       the resource is b/c the physical name is inferred from the logical name.
          //       And it's convenient to access the logical name here.
          if (
            args.type.startsWith("sst:") ||
            args.type === "pulumi-nodejs:dynamic:Resource" ||
            args.type === "random:index/randomId:RandomId" ||
            // resources manually named
            [
              "aws:appsync/dataSource:DataSource",
              "aws:appsync/function:Function",
              "aws:appsync/resolver:Resolver",
              "aws:cognito/identityPool:IdentityPool",
              "aws:ecs/service:Service",
              "aws:ecs/taskDefinition:TaskDefinition",
              "aws:lb/targetGroup:TargetGroup",
              "aws:s3/bucketV2:BucketV2",
              "aws:cloudwatch/eventBus:EventBus",
            ].includes(args.type) ||
            // resources not prefixed
            [
              "aws:acm/certificate:Certificate",
              "aws:acm/certificateValidation:CertificateValidation",
              "aws:apigateway/deployment:Deployment",
              "aws:apigateway/integration:Integration",
              "aws:apigateway/method:Method",
              "aws:apigateway/resource:Resource",
              "aws:apigateway/stage:Stage",
              "aws:apigatewayv2/apiMapping:ApiMapping",
              "aws:apigatewayv2/domainName:DomainName",
              "aws:apigatewayv2/integration:Integration",
              "aws:apigatewayv2/route:Route",
              "aws:apigatewayv2/stage:Stage",
              "aws:appautoscaling/target:Target",
              "aws:appsync/domainName:DomainName",
              "aws:appsync/domainNameApiAssociation:DomainNameApiAssociation",
              "aws:ec2/routeTableAssociation:RouteTableAssociation",
              "aws:iam/accessKey:AccessKey",
              "aws:iam/policy:Policy",
              "aws:iam/userPolicy:UserPolicy",
              "aws:cloudfront/cachePolicy:CachePolicy",
              "aws:cloudfront/distribution:Distribution",
              "aws:cloudwatch/eventRule:EventRule",
              "aws:cloudwatch/eventTarget:EventTarget",
              "aws:cloudwatch/logGroup:LogGroup",
              "aws:cognito/identityPoolRoleAttachment:IdentityPoolRoleAttachment",
              "aws:cognito/identityProvider:IdentityProvider",
              "aws:cognito/userPoolClient:UserPoolClient",
              "aws:lambda/eventSourceMapping:EventSourceMapping",
              "aws:lambda/functionUrl:FunctionUrl",
              "aws:lambda/invocation:Invocation",
              "aws:lambda/permission:Permission",
              "aws:lb/listener:Listener",
              "aws:route53/record:Record",
              "aws:s3/bucketCorsConfigurationV2:BucketCorsConfigurationV2",
              "aws:s3/bucketNotification:BucketNotification",
              "aws:s3/bucketObject:BucketObject",
              "aws:s3/bucketObjectv2:BucketObjectv2",
              "aws:s3/bucketPolicy:BucketPolicy",
              "aws:s3/bucketPublicAccessBlock:BucketPublicAccessBlock",
              "aws:s3/bucketWebsiteConfigurationV2:BucketWebsiteConfigurationV2",
              "aws:ses/domainIdentityVerification:DomainIdentityVerification",
              "aws:sesv2/emailIdentity:EmailIdentity",
              "aws:sns/topicSubscription:TopicSubscription",
              "cloudflare:index/record:Record",
              "cloudflare:index/workerDomain:WorkerDomain",
              "docker:index/image:Image",
              "vercel:index/dnsRecord:DnsRecord",
            ].includes(args.type)
          )
            return;

          const namingRules = [
            {
              // AWS LoadBalancer resource names allow for 32 chars, but an 8 letter suffix
              // ie. "-1234567" is automatically added
              types: ["aws:lb/loadBalancer:LoadBalancer"],
              field: "name",
              cb: () => physicalName(24, args.name),
            },
            {
              types: ["aws:rds/cluster:Cluster"],
              field: "clusterIdentifier",
              cb: () => physicalName(63, args.name).toLowerCase(),
            },
            {
              types: ["aws:rds/clusterInstance:ClusterInstance"],
              field: "identifier",
              cb: () => physicalName(63, args.name).toLowerCase(),
            },
            {
              types: [
                "aws:cloudwatch/eventRule:EventRule",
                "aws:cloudfront/function:Function",
                "aws:iam/user:User",
                "aws:lambda/function:Function",
              ],
              field: "name",
              cb: () => physicalName(64, args.name),
            },
            {
              types: ["aws:sqs/queue:Queue"],
              field: "name",
              cb: () =>
                output(args.props.fifoQueue).apply((fifo) =>
                  physicalName(80, args.name, fifo ? ".fifo" : undefined),
                ),
            },
            {
              types: ["aws:iam/role:Role"],
              field: "name",
              cb: () =>
                getRegionOutput(undefined, {
                  provider: args.opts.provider,
                }).name.apply((region) =>
                  physicalName(
                    64,
                    args.name,
                    `-${region.toLowerCase().replace(/-/g, "")}`,
                  ),
                ),
            },
            {
              types: [
                "aws:apigateway/authorizer:Authorizer",
                "aws:apigateway/restApi:RestApi",
                "aws:apigatewayv2/api:Api",
                "aws:apigatewayv2/authorizer:Authorizer",
                "aws:apigatewayv2/vpcLink:VpcLink",
                "aws:cognito/userPool:UserPool",
                "aws:iot/authorizer:Authorizer",
              ],
              field: "name",
              cb: () => physicalName(128, args.name),
            },
            {
              types: ["aws:iot/topicRule:TopicRule"],
              field: "name",
              cb: () => physicalName(128, args.name).replaceAll("-", "_"),
            },
            {
              types: [
                "aws:appautoscaling/policy:Policy",
                "aws:dynamodb/table:Table",
                "aws:kinesis/stream:Stream",
                "aws:ecs/cluster:Cluster",
              ],
              field: "name",
              cb: () => physicalName(255, args.name),
            },
            {
              types: ["aws:rds/subnetGroup:SubnetGroup"],
              field: "name",
              cb: () => physicalName(255, args.name).toLowerCase(),
            },
            {
              types: [
                "aws:ec2/eip:Eip",
                "aws:ec2/internetGateway:InternetGateway",
                "aws:ec2/natGateway:NatGateway",
                "aws:ec2/routeTable:RouteTable",
                "aws:ec2/securityGroup:SecurityGroup",
                "aws:ec2/defaultSecurityGroup:DefaultSecurityGroup",
                "aws:ec2/subnet:Subnet",
                "aws:ec2/vpc:Vpc",
              ],
              field: "tags",
              cb: () => ({
                // @ts-expect-error
                ...args.tags,
                Name: physicalName(255, args.name),
              }),
            },
            {
              types: ["aws:sns/topic:Topic"],
              field: "name",
              cb: () =>
                output(args.props.fifoTopic).apply((fifo) =>
                  physicalName(256, args.name, fifo ? ".fifo" : undefined),
                ),
            },
            {
              types: ["aws:appsync/graphQLApi:GraphQLApi"],
              field: "name",
              cb: () => physicalName(65536, args.name),
            },
            {
              types: [
                "cloudflare:index/d1Database:D1Database",
                "cloudflare:index/r2Bucket:R2Bucket",
                "cloudflare:index/workerScript:WorkerScript",
                "cloudflare:index/queue:Queue",
              ],
              field: "name",
              cb: () => physicalName(64, args.name).toLowerCase(),
            },
            {
              types: ["cloudflare:index/workersKvNamespace:WorkersKvNamespace"],
              field: "title",
              cb: () => physicalName(64, args.name).toLowerCase(),
            },
          ];

          const rule = namingRules.find((r) => r.types.includes(args.type));
          if (!rule)
            throw new VisibleError(
              `In "${name}" component, the physical name of "${args.name}" (${args.type}) is not prefixed`,
            );

          // name is already set
          if (args.props[rule.field] && args.props[rule.field] !== "") return;

          return {
            props: { ...args.props, [rule.field]: rule.cb() },
            opts: args.opts,
          };
        },
        // When renaming a CloudFront function, when `deleteBeforeReplace` is not set,
        // the engine tries to remove the existing function first, and fails with in-use
        // error. Setting `deleteBeforeReplace` to `false` seems to force the new one
        // gets created and attached first.
        (args) => {
          let override = {};
          if (args.type === "aws:cloudfront/function:Function") {
            override = { deleteBeforeReplace: false };
          }
          return {
            props: args.props,
            opts: { ...args.opts, ...override },
          };
        },
        // Set child resources `retainOnDelete` if set on component
        (args) => ({
          props: args.props,
          opts: {
            ...args.opts,
            retainOnDelete: args.opts.retainOnDelete ?? opts?.retainOnDelete,
          },
        }),
        ...(opts?.transformations ?? []),
      ],
      ...opts,
    });

    // Check component version
    const oldVersion = $cli.state.version[name];
    const newVersion = _version;
    if (oldVersion) {
      const className = type.replaceAll(":", ".");
      if (oldVersion < newVersion) {
        throw new VisibleError(
          [
            `There is a new version of "${className}" that has breaking changes.`,
            `To continue using the previous version, rename "${className}" to "${className}.v${oldVersion}".`,
            `Or recreate this component to update - https://ion.sst.dev/docs/components/#versioning`,
          ].join(" "),
        );
      }
      if (oldVersion > newVersion) {
        throw new VisibleError(
          [
            `It seems you are trying to use an older version of "${className}".`,
            `You need to recreate this component to rollback - https://ion.sst.dev/docs/components/#versioning`,
          ].join(" "),
        );
      }
    }
    if (newVersion > 1) {
      new Version(name, newVersion, { parent: this });
    }
  }
}

const ComponentTransforms = new Map<string, any[]>();
export function $transform<T, Args, Options>(
  resource: { new (name: string, args: Args, opts?: Options): T },
  cb: (args: Args, opts: Options) => void,
) {
  // @ts-expect-error
  const type = resource.__pulumiType;
  if (type.startsWith("sst:")) {
    let transforms = ComponentTransforms.get(type);
    if (!transforms) {
      transforms = [];
      ComponentTransforms.set(type, transforms);
    }
    transforms.push((input: any) => {
      cb(input.props, input.opts);
      return input;
    });
    return;
  }
  runtime.registerStackTransformation((input) => {
    if (input.type !== type) return;
    cb(input.props as any, input.opts as any);
    return input;
  });
}

export class Version extends ComponentResource {
  constructor(target: string, version: number, opts: ComponentResourceOptions) {
    super("sst:sst:Version", target + "Version", {}, opts);
    this.registerOutputs({ target, version });
  }
}
