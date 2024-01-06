import { Input, ComponentResourceOptions, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component } from "./component";

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
  nodes?: {};
}

export class Postgres extends Component {
  private cluster: aws.rds.Cluster;
  private instance: aws.rds.ClusterInstance;

  constructor(
    name: string,
    args?: PostgresArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Postgres", name, args, opts);

    const parent = this;
    const scaling = normalizeScaling();
    const version = normalizeVersion();

    const cluster = createCluster();
    const instance = createInstance();

    this.cluster = cluster;
    this.instance = instance;

    function normalizeScaling() {
      return output(args?.scaling).apply((scaling) => ({
        minCapacity: scaling?.min ?? 0.5,
        maxCapacity: scaling?.max ?? 4,
      }));
    }

    function normalizeVersion() {
      return output(args?.version).apply((version) => version ?? "15.5");
    }

    function createCluster() {
      return new aws.rds.Cluster(
        `${name}Cluster`,
        {
          engine: aws.rds.EngineType.AuroraPostgresql,
          engineMode: "provisioned",
          engineVersion: version,
          databaseName: args?.databaseName,
          masterUsername: "postgres",
          manageMasterUserPassword: true,
          serverlessv2ScalingConfiguration: scaling,
          skipFinalSnapshot: true,
          enableHttpEndpoint: true,
        },
        {
          parent,
        }
      );
    }

    function createInstance() {
      return new aws.rds.ClusterInstance(
        `${name}Instance`,
        {
          clusterIdentifier: cluster.id,
          instanceClass: "db.serverless",
          engine: aws.rds.EngineType.AuroraPostgresql,
          engineVersion: cluster.engineVersion,
        },
        {
          parent,
        }
      );
    }
  }

  public get nodes() {
    return {
      cluster: this.cluster,
      instance: this.instance,
    };
  }
}
