import {
  Input,
  ComponentResourceOptions,
  output,
  Output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "./component";
import { Link } from "./link";

export interface PostgresScalingArgs {
  /**
   * The minimum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2 cluster.
   * @default - 0.5
   * @example
   * ```js
   * {
   *   scaling: {
   *     min: 2
   *   }
   * }
   * ```
   */
  min?: Input<number>;
  /**
   * The maximum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2 cluster.
   * @default - 4
   * @example
   * ```js
   * {
   *   scaling: {
   *     max: 128
   *   }
   * }
   * ```
   */
  max?: Input<number>;
}

export interface PostgresArgs {
  /**
   * Enging version of the RDS cluster
   * @default - 15.5
   * @example
   * ```js
   * {
   *   version: "13.9"
   * }
   * ```
   */
  version?: Input<string>;
  /**
   * Name of a database which is automatically created inside the cluster.
   * @default - Database is not created
   * @example
   * ```js
   * {
   *   databaseName: "app"
   * }
   * ```
   */
  databaseName?: Input<string>;
  /**
   * Aurora Serverless v2 scaling configuration
   */
  scaling?: Input<PostgresScalingArgs>;
  transform?: {
    cluster?: Transform<aws.rds.ClusterArgs>;
    instance?: Transform<aws.rds.ClusterInstanceArgs>;
  };
}

export class Postgres
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private cluster: aws.rds.Cluster;
  private instance: aws.rds.ClusterInstance;
  private databaseName: Output<string>;

  constructor(
    name: string,
    args?: PostgresArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:sst:Postgres", name, args, opts);

    const parent = this;
    const scaling = normalizeScaling();
    const version = normalizeVersion();
    const databaseName = normalizeDatabaseName();

    const cluster = createCluster();
    const instance = createInstance();

    this.cluster = cluster;
    this.instance = instance;
    this.databaseName = databaseName;

    function normalizeScaling() {
      return output(args?.scaling).apply((scaling) => ({
        minCapacity: scaling?.min ?? 0.5,
        maxCapacity: scaling?.max ?? 4,
      }));
    }

    function normalizeVersion() {
      return output(args?.version).apply((version) => version ?? "15.5");
    }

    function normalizeDatabaseName() {
      return output(args?.databaseName).apply((name) => name ?? $app.name);
    }

    function createCluster() {
      return new aws.rds.Cluster(
        `${name}Cluster`,
        transform(args?.transform?.cluster, {
          engine: aws.rds.EngineType.AuroraPostgresql,
          engineMode: "provisioned",
          engineVersion: version,
          databaseName,
          masterUsername: "postgres",
          manageMasterUserPassword: true,
          serverlessv2ScalingConfiguration: scaling,
          skipFinalSnapshot: true,
          enableHttpEndpoint: true,
        }),
        {
          parent,
        },
      );
    }

    function createInstance() {
      return new aws.rds.ClusterInstance(
        `${name}Instance`,
        transform(args?.transform?.instance, {
          clusterIdentifier: cluster.id,
          instanceClass: "db.serverless",
          engine: aws.rds.EngineType.AuroraPostgresql,
          engineVersion: cluster.engineVersion,
        }),
        {
          parent,
        },
      );
    }
  }

  public get nodes() {
    return {
      cluster: this.cluster,
      instance: this.instance,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      type: `{ clusterArn: string; secretArn: string; databaseName: string }`,
      value: {
        clusterArn: this.cluster.arn,
        secretArn: this.cluster.masterUserSecrets[0].secretArn,
        databaseName: this.databaseName,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["secretsmanager:GetSecretValue"],
        resources: [this.cluster.masterUserSecrets[0].secretArn],
      },
      {
        actions: ["rds-data:ExecuteStatement"],
        resources: [this.cluster.arn],
      },
    ];
  }
}
