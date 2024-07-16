import {
  ComponentResource,
  ComponentResourceOptions,
  Inputs,
  runtime,
  output,
} from "@pulumi/pulumi";
import { prefixName } from "./naming.js";
import { VisibleError } from "./error.js";
import { getRegionOutput } from "@pulumi/aws";

/**
 * Helper type to inline nested types
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Transform<T> = Partial<T> | ((args: T) => undefined);
export function transform<T extends object>(
  transform: Transform<T> | undefined,
  args: T,
) {
  // Case: transform is a function
  if (typeof transform === "function") {
    transform(args);
    return args;
  }

  // Case: no transform
  // Case: transform is an argument
  return { ...args, ...transform };
}

export class Component extends ComponentResource {
  constructor(
    type: string,
    name: string,
    args?: Inputs,
    opts?: ComponentResourceOptions,
  ) {
    const transforms = ComponentTransforms.get(type) ?? [];
    for (const transform of transforms) {
      transform({ props: args, opts });
    }
    super(type, name, args, {
      transformations: [
        (args) => {
          // Ensure names are prefixed with parent's name
          if (
            args.type !== type &&
            // @ts-expect-error
            !args.name.startsWith(args.opts.parent!.__name)
          ) {
            throw new Error(
              `In "${name}" component, the name of "${args.name}" (${args.type}) is not prefixed with parent's name`,
            );
          }

          // Ensure physical names are prefixed with app/stage
          if (args.type.startsWith("sst:")) return undefined;
          if (args.type === "pulumi-nodejs:dynamic:Resource") return undefined;
          if (args.type === "random:index/randomId:RandomId") return undefined;

          let overrides;
          switch (args.type) {
            // AWS LoadBalancer resource names allow for 32 chars, but an 8 letter suffix
            // ie. "-1234567" is automatically added
            case "aws:lb/loadBalancer:LoadBalancer":
              overrides = { name: prefixName(24, args.name) };
              break;
            case "aws:rds/cluster:Cluster":
              overrides = {
                clusterIdentifier: prefixName(63, args.name).toLowerCase(),
              };
              break;
            case "aws:rds/clusterInstance:ClusterInstance":
              overrides = {
                identifier: prefixName(63, args.name).toLowerCase(),
              };
              break;
            case "aws:cloudwatch/eventRule:EventRule":
            case "aws:iam/user:User":
            case "aws:lambda/function:Function":
              overrides = { name: prefixName(64, args.name) };
              break;
            case "aws:sqs/queue:Queue":
              overrides = {
                name: output(args.props.fifoQueue).apply((fifo) =>
                  prefixName(80, args.name, fifo ? ".fifo" : undefined),
                ),
              };
              break;
            case "aws:iam/role:Role":
              overrides = {
                name: getRegionOutput(undefined, {
                  provider: args.opts.provider,
                }).name.apply((region) =>
                  prefixName(
                    64,
                    args.name,
                    `-${region.toLowerCase().replace(/-/g, "")}`,
                  ),
                ),
              };
              break;
            case "aws:apigateway/authorizer:Authorizer":
            case "aws:apigateway/restApi:RestApi":
            case "aws:apigatewayv2/api:Api":
            case "aws:apigatewayv2/authorizer:Authorizer":
            case "aws:cognito/userPool:UserPool":
            case "aws:iot/authorizer:Authorizer":
              overrides = { name: prefixName(128, args.name) };
              break;
            case "aws:iot/topicRule:TopicRule":
              overrides = {
                name: prefixName(128, args.name).replaceAll("-", "_"),
              };
              break;
            case "aws:appautoscaling/policy:Policy":
            case "aws:dynamodb/table:Table":
            case "aws:kinesis/stream:Stream":
            case "aws:ecs/cluster:Cluster":
              overrides = { name: prefixName(255, args.name) };
              break;
            case "aws:rds/subnetGroup:SubnetGroup":
              overrides = { name: prefixName(255, args.name).toLowerCase() };
              break;
            case "aws:ec2/eip:Eip":
            case "aws:ec2/internetGateway:InternetGateway":
            case "aws:ec2/natGateway:NatGateway":
            case "aws:ec2/routeTable:RouteTable":
            case "aws:ec2/securityGroup:SecurityGroup":
            case "aws:ec2/subnet:Subnet":
            case "aws:ec2/vpc:Vpc":
              overrides = {
                tags: {
                  // @ts-expect-error
                  ...args.tags,
                  Name: prefixName(255, args.name),
                },
              };
              break;
            case "aws:sns/topic:Topic":
              overrides = {
                name: output(args.props.fifoTopic).apply((fifo) =>
                  prefixName(256, args.name, fifo ? ".fifo" : undefined),
                ),
              };
              break;
            case "aws:appsync/graphQLApi:GraphQLApi":
              overrides = { name: prefixName(65536, args.name) };
              break;
            case "cloudflare:index/d1Database:D1Database":
            case "cloudflare:index/r2Bucket:R2Bucket":
            case "cloudflare:index/workerScript:WorkerScript":
            case "cloudflare:index/queue:Queue":
              overrides = {
                name: prefixName(64, args.name).toLowerCase(),
              };
              break;
            case "cloudflare:index/workersKvNamespace:WorkersKvNamespace":
              overrides = {
                title: prefixName(64, args.name).toLowerCase(),
              };
              break;
            // resources manually named
            case "aws:appsync/dataSource:DataSource":
            case "aws:appsync/function:Function":
            case "aws:appsync/resolver:Resolver":
            case "aws:cognito/identityPool:IdentityPool":
            case "aws:ecs/service:Service":
            case "aws:ecs/taskDefinition:TaskDefinition":
            case "aws:lb/targetGroup:TargetGroup":
            case "aws:s3/bucketV2:BucketV2":
            case "aws:cloudwatch/eventBus:EventBus":
              break;
            // resources not prefixed
            case "aws:acm/certificate:Certificate":
            case "aws:acm/certificateValidation:CertificateValidation":
            case "aws:apigateway/deployment:Deployment":
            case "aws:apigateway/integration:Integration":
            case "aws:apigateway/method:Method":
            case "aws:apigateway/resource:Resource":
            case "aws:apigateway/stage:Stage":
            case "aws:apigatewayv2/apiMapping:ApiMapping":
            case "aws:apigatewayv2/domainName:DomainName":
            case "aws:apigatewayv2/integration:Integration":
            case "aws:apigatewayv2/route:Route":
            case "aws:apigatewayv2/stage:Stage":
            case "aws:appautoscaling/target:Target":
            case "aws:appsync/domainName:DomainName":
            case "aws:appsync/domainNameApiAssociation:DomainNameApiAssociation":
            case "aws:ec2/routeTableAssociation:RouteTableAssociation":
            case "aws:iam/accessKey:AccessKey":
            case "aws:iam/policy:Policy":
            case "aws:iam/rolePolicyAttachment:RolePolicyAttachment":
            case "aws:iam/userPolicy:UserPolicy":
            case "aws:cloudfront/cachePolicy:CachePolicy":
            case "aws:cloudfront/distribution:Distribution":
            case "aws:cloudfront/function:Function":
            case "aws:cloudfront/originAccessIdentity:OriginAccessIdentity":
            case "aws:cloudwatch/eventRule:EventRule":
            case "aws:cloudwatch/eventTarget:EventTarget":
            case "aws:cloudwatch/logGroup:LogGroup":
            case "aws:cognito/identityPoolRoleAttachment:IdentityPoolRoleAttachment":
            case "aws:cognito/userPoolClient:UserPoolClient":
            case "aws:lambda/eventSourceMapping:EventSourceMapping":
            case "aws:lambda/functionUrl:FunctionUrl":
            case "aws:lambda/invocation:Invocation":
            case "aws:lambda/permission:Permission":
            case "aws:lb/listener:Listener":
            case "aws:route53/record:Record":
            case "aws:s3/bucketCorsConfigurationV2:BucketCorsConfigurationV2":
            case "aws:s3/bucketNotification:BucketNotification":
            case "aws:s3/bucketObject:BucketObject":
            case "aws:s3/bucketObjectv2:BucketObjectv2":
            case "aws:s3/bucketPolicy:BucketPolicy":
            case "aws:s3/bucketPublicAccessBlock:BucketPublicAccessBlock":
            case "aws:s3/bucketWebsiteConfigurationV2:BucketWebsiteConfigurationV2":
            case "aws:ses/domainIdentityVerification:DomainIdentityVerification":
            case "aws:sesv2/emailIdentity:EmailIdentity":
            case "aws:sns/topicSubscription:TopicSubscription":
            case "cloudflare:index/record:Record":
            case "cloudflare:index/workerDomain:WorkerDomain":
            case "docker:index/image:Image":
            case "vercel:index/dnsRecord:DnsRecord":
              break;
            default:
              throw new VisibleError(
                `In "${name}" component, the physical name of "${args.name}" (${args.type}) is not prefixed`,
              );
          }
          return {
            props: { ...args.props, ...overrides },
            opts: args.opts,
          };
        },
        ...(opts?.transformations ?? []),
      ],
      ...opts,
    });
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
