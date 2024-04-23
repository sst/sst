import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import { Component, Prettify, Transform, transform } from "../component";
import { Input } from "../input";
import { Dns } from "../dns";
import { FunctionArgs } from "./function";
import { ClusterService as ClusterServiceComponent } from "./cluster-service";
import { RETENTION } from "./logging.js";

export const supportedCpus = {
  "0.25 vCPU": 256,
  "0.5 vCPU": 512,
  "1 vCPU": 1024,
  "2 vCPU": 2048,
  "4 vCPU": 4096,
  "8 vCPU": 8192,
  "16 vCPU": 16384,
};

export const supportedMemories = {
  "0.25 vCPU": {
    "0.5 GB": 512,
    "1 GB": 1024,
    "2 GB": 2048,
  },
  "0.5 vCPU": {
    "1 GB": 1024,
    "2 GB": 2048,
    "3 GB": 3072,
    "4 GB": 4096,
  },
  "1 vCPU": {
    "2 GB": 2048,
    "3 GB": 3072,
    "4 GB": 4096,
    "5 GB": 5120,
    "6 GB": 6144,
    "7 GB": 7168,
    "8 GB": 8192,
  },
  "2 vCPU": {
    "4 GB": 4096,
    "5 GB": 5120,
    "6 GB": 6144,
    "7 GB": 7168,
    "8 GB": 8192,
    "9 GB": 9216,
    "10 GB": 10240,
    "11 GB": 11264,
    "12 GB": 12288,
    "13 GB": 13312,
    "14 GB": 14336,
    "15 GB": 15360,
    "16 GB": 16384,
  },
  "4 vCPU": {
    "8 GB": 8192,
    "9 GB": 9216,
    "10 GB": 10240,
    "11 GB": 11264,
    "12 GB": 12288,
    "13 GB": 13312,
    "14 GB": 14336,
    "15 GB": 15360,
    "16 GB": 16384,
    "17 GB": 17408,
    "18 GB": 18432,
    "19 GB": 19456,
    "20 GB": 20480,
    "21 GB": 21504,
    "22 GB": 22528,
    "23 GB": 23552,
    "24 GB": 24576,
    "25 GB": 25600,
    "26 GB": 26624,
    "27 GB": 27648,
    "28 GB": 28672,
    "29 GB": 29696,
    "30 GB": 30720,
  },
  "8 vCPU": {
    "16 GB": 16384,
    "20 GB": 20480,
    "24 GB": 24576,
    "28 GB": 28672,
    "32 GB": 32768,
    "36 GB": 36864,
    "40 GB": 40960,
    "44 GB": 45056,
    "48 GB": 49152,
    "52 GB": 53248,
    "56 GB": 57344,
    "60 GB": 61440,
  },
  "16 vCPU": {
    "32 GB": 32768,
    "40 GB": 40960,
    "48 GB": 49152,
    "56 GB": 57344,
    "64 GB": 65536,
    "72 GB": 73728,
    "80 GB": 81920,
    "88 GB": 90112,
    "96 GB": 98304,
    "104 GB": 106496,
    "112 GB": 114688,
    "120 GB": 122880,
  },
};

type Port = `${number}/${"http" | "https" | "tcp" | "udp" | "tcp_udp" | "tls"}`;

interface DomainArgs {
  /**
   * The custom domain you want to use. Supports domains hosted on [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   * @example
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   */
  name: Input<string>;
  /**
   * The ARN of an existing certificate in the `us-east-1` region in AWS Certificate Manager
   * to use for the domain. By default, SST will create a certificate with the domain name.
   * The certificate will be created in the `us-east-1`(N. Virginia) region as required by
   * AWS CloudFront.
   *
   * @example
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     cert: "arn:aws:acm:us-east-1:112233445566:certificate/3a958790-8878-4cdc-a396-06d95064cf63"
   *   }
   * }
   * ```
   */
  cert?: Input<string>;
  /**
   * The DNS adapter you want to use for managing DNS records.
   *
   * :::note
   * If `dns` is set to `false`, you must provide a validated certificate via `cert`. And
   * you have to add the DNS records manually to point to the CloudFront distribution URL.
   * :::
   *
   * @default `sst.aws.dns`
   * @example
   *
   * Specify the hosted zone ID for the domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     dns: sst.aws.dns({
   *       zone: "Z2FDTNDATAQYW2"
   *     })
   *   }
   * }
   * ```
   *
   * Domain is hosted on Cloudflare.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     dns: sst.cloudflare.dns()
   *   }
   * }
   * ```
   */
  dns?: Input<false | (Dns & {})>;
}

export interface ClusterArgs {
  /**
   * The VPC to use for the cluster.
   *
   */
  vpc: Input<{
    /**
     * The ID of the VPC.
     */
    id: Input<string>;
    /**
     * A list of public subnet IDs in the VPC.
     */
    publicSubnets: Input<Input<string>[]>;
    /**
     * A list of private subnet IDs in the VPC.
     */
    privateSubnets: Input<Input<string>[]>;
    /**
     * A list of VPC security group IDs.
     */
    securityGroups: Input<Input<string>[]>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the ECS Cluster resource.
     */
    cluster?: Transform<aws.ecs.ClusterArgs>;
  };
}

export interface ClusterServiceArgs {
  name: string;
  image?: Input<{
    context?: Input<string>;
    dockerfile?: Input<string>;
    args?: Input<Record<string, Input<string>>>;
  }>;
  public?: Input<{
    domain?: Input<string | Prettify<DomainArgs>>;
    ports: Input<{ listen: Input<Port>; forward?: Input<Port> }[]>;
  }>;
  /**
   * The CPU architecture of the container.
   * @default "x86_64"
   * @example
   * ```js
   * {
   *   architecture: "arm64",
   * }
   * ```
   */
  architecture?: Input<"x86_64" | "arm64">;
  /**
   * The amount of CPU allocated.
   * @default "0.25 vCPU"
   * @example
   * ```js
   * {
   *   cpu: "1 vCPU",
   * }
   *```
   */
  cpu?: keyof typeof supportedCpus;
  /**
   * The amount of memory allocated.
   * @default "0.5 GB"
   * @example
   * ```js
   * {
   *   memory: "2 GB",
   * }
   *```
   */
  memory?: `${number} GB`;
  /**
   * The amount of ephemeral storage allocated, in GB.
   * @default "21 GB"
   * @example
   * ```js
   * {
   *   storage: "100 GB",
   * }
   * ```
   */
  storage?: `${number} GB`;
  link?: FunctionArgs["link"];
  permissions?: FunctionArgs["permissions"];
  environment?: FunctionArgs["environment"];
  /**
   * Configure the service logs in CloudWatch.
   * @default `&lcub;retention: "forever"&rcub;`
   * @example
   * ```js
   * {
   *   logging: {
   *     retention: "1 week"
   *   }
   * }
   * ```
   */
  logging?: Input<{
    /**
     * The duration the function logs are kept in CloudWatch.
     * @default `forever`
     */
    retention?: Input<keyof typeof RETENTION>;
  }>;
  scaling?: Input<{
    /**
     * The minimum capacity for the cluster.
     * @default 1
     * @example
     * ```js
     * {
     *   scaling: {
     *    minContainers: 4,
     *    maxContainers: 16,
     *   },
     * }
     *```
     */
    min?: Input<number>;
    /**
     * The maximum capacity for the cluster.
     * @default 1
     * @example
     * ```js
     * {
     *   scaling: {
     *    minContainers: 4,
     *    maxContainers: 16,
     *   },
     * }
     *```
     */
    max?: Input<number>;
    /**
     * Scales in or out to achieve a target cpu utilization.
     * @default 70
     * @example
     * ```js
     * {
     *   scaling: {
     *    cpuUtilization: 50,
     *    memoryUtilization: 50,
     *   },
     * }
     *```
     */
    cpuUtilization?: Input<number>;
    /**
     * Scales in or out to achieve a target memory utilization.
     * @default 70
     * @example
     * ```js
     * {
     *   scaling: {
     *    cpuUtilization: 50,
     *    memoryUtilization: 50,
     *   },
     * }
     *```
     */
    memoryUtilization?: Input<number>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Docker Image resource.
     */
    image?: Transform<docker.ImageArgs>;
    /**
     * Transform the ECS Service resource.
     */
    service?: Transform<aws.ecs.ServiceArgs>;
    /**
     * Transform the ECS Task IAM Role resource.
     */
    taskRole?: Transform<aws.iam.RoleArgs>;
    /**
     * Transform the ECS Task Definition resource.
     */
    taskDefinition?: Transform<aws.ecs.TaskDefinitionArgs>;
    /**
     * Transform the AWS Load Balancer resource.
     */
    loadBalancer?: Transform<aws.lb.LoadBalancerArgs>;
    /**
     * Transform the AWS Load Balancer listener resource.
     */
    listener?: Transform<aws.lb.ListenerArgs>;
    /**
     * Transform the AWS Load Balancer target group resource.
     */
    target?: Transform<aws.lb.TargetGroupArgs>;
    /**
     * Transform the CloudWatch log group resource.
     */
    logGroup?: Transform<aws.cloudwatch.LogGroupArgs>;
  };
}

export interface ClusterService {
  /**
   * The ECS Cluster resource.
   */
  service: aws.ecs.Cluster;
}

/**
 * The `Vpc` component lets you add a VPC to your app. It uses [Amazon VPC](https://docs.aws.amazon.com/vpc/).
 *
 * This component creates:
 * - A VPC.
 * - Two Subnets (Public and Private).
 * - An Internet Gateway, and a Route Table routing traffic to the Internet Gateway in the Public Subnet.
 * - A NAT Gateway, and a Route Table routing traffic to the NAT Gateway in the Private Subnet.
 * - A Security Group.
 *
 * @example
 *
 * #### Create a VPC
 *
 * ```ts
 * const vpc = new sst.aws.Vpc("MyVPC");
 * ```
 */
export class Cluster extends Component {
  private name: string;
  private args: ClusterArgs;
  private opts?: ComponentResourceOptions;
  private cluster: aws.ecs.Cluster;

  constructor(
    name: string,
    args: ClusterArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const cluster = createCluster();

    this.name = name;
    this.args = args;
    this.opts = opts;
    this.cluster = cluster;

    function createCluster() {
      return new aws.ecs.Cluster(
        `${name}Cluster`,
        transform(args.transform?.cluster, {}),
        { parent },
      );
    }
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon ECS Cluster.
       */
      cluster: this.cluster,
    };
  }

  /**
   * Subscribe to this queue.
   *
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * ```js
   * queue.subscribe("src/subscriber.handler");
   *
   * Add a filter to the subscription.
   *
   * ```js
   * queue.subscribe("src/subscriber.handler", {
   *   filters: [
   *     {
   *       body: {
   *         RequestCode: ["BBBB"]
   *       }
   *     }
   *   ]
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * queue.subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
   * });
   * ```
   */
  public addService(args: ClusterServiceArgs) {
    const namePrefix = `${this.name}${args.name}`;
    const component = new ClusterServiceComponent(
      namePrefix,
      this.cluster,
      this.args.vpc,
      args,
      this.opts,
    );

    return {
      get url() {
        return component.url;
      },
      get loadBalancer() {
        return component.nodes.loadBalancer;
      },
      get service() {
        return component.nodes.service;
      },
      get taskRole() {
        return component.nodes.taskRole;
      },
      get taskDefinition() {
        return component.nodes.taskDefinition;
      },
    };
  }
}

const __pulumiType = "sst:aws:Cluster";
// @ts-expect-error
Cluster.__pulumiType = __pulumiType;
