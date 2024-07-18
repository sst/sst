import { ComponentResourceOptions, output, Output } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import { Input } from "../input.js";
import { rds } from "@pulumi/aws";
import { permission } from "./permission";

type ACU = `${number} ACU`;

function parseACU(acu: ACU) {
  const result = parseFloat(acu.split(" ")[0]);
  return result;
}

export interface PostgresArgs {
  /**
   * The Postgres engine version. Check out the [available versions in your region](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html#Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.apg).
   * @default `"15.5"`
   * @example
   * ```js
   * {
   *   version: "13.9"
   * }
   * ```
   */
  version?: Input<string>;
  /**
   * Name of a database that is automatically created inside the cluster.
   *
   * The name must begin with a letter and contain only lowercase letters, numbers, or underscores. By default, it takes the name of the app, and replaces the hyphens with underscores.
   *
   * @default Based on the name of the current app
   * @example
   * ```js
   * {
   *   databaseName: "acme"
   * }
   * ```
   */
  databaseName?: Input<string>;
  /**
   * The Aurora Serverless v2 scaling config. By default, the cluster has one DB instance that
   * is used for both writes and reads. The instance can scale from the minimum number of ACUs
   * to the maximum number of ACUs.
   *
   * :::caution
   * Aurora Serverless v2 does not scale down to 0. The minimum cost of a Postgres cluster
   * per month is roughly `0.5 * $0.12 per ACU hour * 24 hrs * 30 days = $43.20`.
   * :::
   *
   * An ACU or Aurora Capacity Unit is a combination of CPU and RAM. The cost of an Aurora Serverless v2 cluster is based on the ACU hours
   * used. Additionally, you are billed for I/O and storage used by the cluster.
   * [Read more here](https://aws.amazon.com/rds/aurora/pricing/).
   *
   * Each ACU is roughly equivalent to 2 GB of memory. So pick the minimum and maximum
   * based on the baseline and peak memory usage of your app.
   *
   * @default `{min: "0.5 ACU", max: "4 ACU"}`
   */
  scaling?: Input<{
    /**
     * The minimum number of ACUs, ranges from 0.5 to 128, in increments of 0.5.
     *
     * For your production workloads, setting a minimum of 0.5 ACUs might not be a great idea due
     * to the following reasons, you can also [read more here](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.setting-capacity.incompatible_parameters).
     * - It takes longer to scale from a low number of ACUs to a much higher number.
     * - Query performance depends on the buffer cache. So if frequently accessed data cannot
     *   fit into the buffer cache, you might see uneven performance.
     * - The max connections for a 0.5 ACU Postgres instance is capped at 2000.
     *
     * @default `0.5 ACU`
     * @example
     * ```js
     * {
     *   scaling: {
     *     min: "2 ACU"
     *   }
     * }
     * ```
     */
    min?: Input<ACU>;
    /**
     * The maximum number of ACUs, ranges from 0.5 to 128, in increments of 0.5.
     *
     * @default `4 ACU`
     * @example
     * ```js
     * {
     *   scaling: {
     *     max: "128 ACU"
     *   }
     * }
     * ```
     */
    max?: Input<ACU>;
  }>;
  /**
   * The VPC to use for the database cluster.
   *
   * :::note
   * The default VPC does not have a private subnet and is not recommended for production.
   * :::
   *
   * By default, your account has a VPC in each account.
   * This comes with a public subnet. If you don't specify a VPC, it'll use the default one.
   * This is not recommended for production.
   *
   * @default The default VPC in your account.
   *
   * @example
   * ```js
   * {
   *   vpc: {
   *     privateSubnets: ["subnet-0db7376a7ad4db5fd ", "subnet-06fc7ee8319b2c0ce"],
   *     securityGroups: ["sg-0399348378a4c256c"],
   *   }
   * }
   * ```
   *
   * Or create a `Vpc` component.
   *
   * ```js
   * const myVpc = new sst.aws.Vpc("MyVpc");
   * ```
   *
   * And pass it in.
   *
   * ```js
   * {
   *   vpc: myVpc
   * }
   * ```
   */
  vpc?: Input<{
    /**
     * A list of private subnet IDs in the VPC. The database will be placed in the private
     * subnets.
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
     * Transform the RDS subnet group.
     */
    subnetGroup?: Transform<rds.SubnetGroupArgs>;
    /**
     * Transform the RDS Cluster.
     */
    cluster?: Transform<rds.ClusterArgs>;
    /**
     * Transform the database instance in the RDS Cluster.
     */
    instance?: Transform<rds.ClusterInstanceArgs>;
  };
}

/**
 * The `Postgres` component lets you add a Postgres database to your app using
 * [Amazon Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html).
 *
 * :::note
 * Data API for Aurora Postgres Serverless v2 is still being [rolled out in all regions](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html#Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.apg).
 * :::
 *
 * To connect to your database from your Lambda functions, you can use the
 * [AWS Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html). It
 * does not need a persistent connection, and works over HTTP. You also don't need a VPN to
 * connect to it locally.
 *
 * @example
 *
 * #### Create the database
 *
 * ```js title="sst.config.ts"
 * const database = new sst.aws.Postgres("MyDatabase");
 * ```
 *
 * #### Use a VPC
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const database = new sst.aws.Postgres("MyDatabase", { vpc });
 * ```
 *
 * #### Change the scaling config
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Postgres("MyDatabase", {
 *   scaling: {
 *     min: "2 ACU",
 *     max: "128 ACU"
 *   }
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can link your database to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [database]
 * });
 * ```
 *
 * Once linked, you can connect to it from your function code.
 *
 * ```ts title="app/page.tsx" {1,6,7,8}
 * import { Resource } from "sst";
 * import { drizzle } from "drizzle-orm/aws-data-api/pg";
 * import { RDSDataClient } from "@aws-sdk/client-rds-data";
 *
 * drizzle(new RDSDataClient({}), {
 *   database: Resource.MyDatabase.database,
 *   secretArn: Resource.MyDatabase.secretArn,
 *   resourceArn: Resource.MyDatabase.clusterArn
 * });
 * ```
 */
export class Postgres extends Component implements Link.Linkable {
  private cluster: rds.Cluster;
  private instance: rds.ClusterInstance;
  private databaseName: Output<string>;

  constructor(
    name: string,
    args?: PostgresArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;
    const scaling = normalizeScaling();
    const version = normalizeVersion();
    const databaseName = normalizeDatabaseName();

    const subnetGroup = createSubnetGroup();
    const cluster = createCluster();
    const instance = createInstance();

    this.cluster = cluster;
    this.instance = instance;
    this.databaseName = databaseName;

    function normalizeScaling() {
      return output(args?.scaling).apply((scaling) => ({
        minCapacity: parseACU(scaling?.min ?? "0.5 ACU"),
        maxCapacity: parseACU(scaling?.max ?? "4 ACU"),
      }));
    }

    function normalizeVersion() {
      return output(args?.version).apply((version) => version ?? "15.5");
    }

    function normalizeDatabaseName() {
      return output(args?.databaseName).apply(
        (name) => name ?? $app.name.replaceAll("-", "_"),
      );
    }

    function createSubnetGroup() {
      if (!args?.vpc) return;

      return new rds.SubnetGroup(
        `${name}SubnetGroup`,
        transform(args?.transform?.subnetGroup, {
          subnetIds: output(args.vpc).privateSubnets,
        }),
        { parent },
      );
    }

    function createCluster() {
      return new rds.Cluster(
        `${name}Cluster`,
        transform(args?.transform?.cluster, {
          engine: rds.EngineType.AuroraPostgresql,
          engineMode: "provisioned",
          engineVersion: version,
          databaseName,
          masterUsername: "postgres",
          manageMasterUserPassword: true,
          serverlessv2ScalingConfiguration: scaling,
          skipFinalSnapshot: true,
          enableHttpEndpoint: true,
          dbSubnetGroupName: subnetGroup?.name,
          vpcSecurityGroupIds: args?.vpc && output(args.vpc).securityGroups,
        }),
        { parent },
      );
    }

    function createInstance() {
      return new rds.ClusterInstance(
        `${name}Instance`,
        transform(args?.transform?.instance, {
          clusterIdentifier: cluster.id,
          instanceClass: "db.serverless",
          engine: rds.EngineType.AuroraPostgresql,
          engineVersion: cluster.engineVersion,
          dbSubnetGroupName: subnetGroup?.name,
        }),
        { parent },
      );
    }
  }

  /**
   * The ARN of the RDS Cluster.
   */
  public get clusterArn() {
    return this.cluster.arn;
  }

  /**
   * The ARN of the master user secret.
   */
  public get secretArn() {
    return this.cluster.masterUserSecrets[0].secretArn;
  }

  /**
   * The name of the database.
   */
  public get database() {
    return this.databaseName;
  }

  public get nodes() {
    return {
      cluster: this.cluster,
      instance: this.instance,
    };
  }

  /** @internal */
  public getSSTLink() {
    return getSSTLink(this.cluster);
  }

  /** @internal */
  public static get(
    name: string,
    args: rds.GetClusterArgs,
    opts?: ComponentResourceOptions,
  ) {
    return new PostgresRef(name, args, opts);
  }
}

function getSSTLink(
  cluster: rds.Cluster | Output<rds.GetClusterResult>,
): Link.Definition {
  return {
    properties: {
      clusterArn: cluster.arn,
      secretArn: cluster.masterUserSecrets[0].secretArn,
      database: cluster.databaseName,
    },
    include: [
      permission({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [cluster.masterUserSecrets[0].secretArn],
      }),
      permission({
        actions: [
          "rds-data:BatchExecuteStatement",
          "rds-data:BeginTransaction",
          "rds-data:CommitTransaction",
          "rds-data:ExecuteStatement",
          "rds-data:RollbackTransaction",
        ],
        resources: [cluster.arn],
      }),
    ],
  };
}

class PostgresRef extends Component implements Link.Linkable {
  private cluster: Output<rds.GetClusterResult>;

  constructor(
    name: string,
    args: rds.GetClusterOutputArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType + "Ref", name, args, opts);
    this.cluster = rds.getClusterOutput(args, opts);
  }
  /**
   * The ARN of the RDS Cluster.
   */
  public get clusterArn() {
    return this.cluster.arn;
  }

  /**
   * The ARN of the master user secret.
   */
  public get secretArn() {
    return this.cluster.masterUserSecrets[0].secretArn;
  }

  /**
   * The name of the database.
   */
  public get database() {
    return this.cluster.databaseName;
  }

  /** @internal */
  public getSSTLink() {
    return getSSTLink(this.cluster);
  }
}

const __pulumiType = "sst:aws:Postgres";
// @ts-expect-error
Postgres.__pulumiType = __pulumiType;
