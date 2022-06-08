import path from "path";
import glob from "glob";
import fs from "fs-extra";
import * as crypto from "crypto";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App } from "./App.js";
import { getFunctionRef, SSTConstruct } from "./Construct.js";
import { Function as Fn } from "./Function.js";
import url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/////////////////////
// Interfaces
/////////////////////

export interface RDSProps {
  /**
   * Database engine of the cluster. Cannot be changed once set.
   */
  engine: "mysql5.6" | "mysql5.7" | "postgresql10.14";

  /**
   * Name of a database which is automatically created inside the cluster.
   */
  defaultDatabaseName: string;

  scaling?: {
    /**
     * The time before the cluster is paused.
     *
     * Pass in true to pause after 5 minutes of inactive. And pass in false to
     * disable pausing.
     *
     * Or pass in the number of minutes to wait before the cluster is paused.
     *
     * @default true
     *
     * @example
     * ```js
     * new RDS(stack, "Database", {
     *   scaling: {
     *     autoPause: props.app.stage !== "prod"
     *   }
     * })
     * ```
     */
    autoPause?: boolean | number;

    /**
     * The minimum capacity for the cluster.
     *
     * @default "ACU_2"
     */
    minCapacity?: keyof typeof rds.AuroraCapacityUnit;

    /**
     * The maximum capacity for the cluster.
     *
     * @default "ACU_16"
     */
    maxCapacity?: keyof typeof rds.AuroraCapacityUnit;
  };

  /**
   * Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.
   *
   * @example
   *
   * ```js
   * new RDS(stack, "Database", {
   *   engine: "postgresql10.14",
   *   defaultDatabaseName: "acme",
   *   migrations: "path/to/migration/scripts",
   * });
   * ```
   */
  migrations?: string;

  /**
   * Path to place generated typescript types after running migrations
   *
   * @example
   *
   * ```js
   * new RDS(stack, "Database", {
   *   engine: "postgresql10.14",
   *   defaultDatabaseName: "acme",
   *   migrations: "path/to/migration/scripts",
   *   types: "backend/core/sql/types.ts",
   * });
   * ```
   */
  types?: string;

  cdk?: {
    /**
     * Configure the internallly created RDS cluster.
     *
     * @example
     * ```js
     * new RDS(stack, "Database", {
     *   cdk: {
     *     cluster: {
     *       clusterIdentifier: "my-cluster",
     *     }
     *   },
     * });
     * ```
     */
    cluster?: RDSCdkServerlessClusterProps;
  };
}

export type RDSEngineType = "mysql5.6" | "mysql5.7" | "postgresql10.14";

export interface RDSCdkServerlessClusterProps
  extends Omit<
    rds.ServerlessClusterProps,
    "vpc" | "engine" | "defaultDatabaseName" | "scaling"
  > {
  vpc?: ec2.IVpc;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/). It uses the following defaults:
 *
 * - Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it serverless.
 * - Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).
 * - Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions to access the database cluster without needing to deploy the functions in a VPC (virtual private cloud).
 * - Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { RDS } from "@serverless-stack/resources";
 *
 * new RDS(stack, "Database", {
 *   engine: "postgresql10.14",
 *   defaultDatabaseName: "my_database",
 * });
 * ```
 *
 */
export class RDS extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The ARN of the internally created CDK ServerlessCluster instance.
     */
    cluster: rds.ServerlessCluster;
  };
  public readonly defaultDatabaseName: string;
  /**
   * The ARN of the internally created CDK ServerlessCluster instance.
   */
  public readonly migratorFunction?: Fn;
  private engine: string;
  private readonly types?: string;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, id);

    const app = scope.node.root as App;
    const { cdk, engine, defaultDatabaseName, scaling, migrations } =
      props || {};
    this.cdk = {} as any;

    ////////////////////
    // Create Bucket
    ////////////////////

    const rdsServerlessClusterProps = (cdk?.cluster ||
      {}) as RDSCdkServerlessClusterProps;

    this.validateRDSServerlessClusterProps(rdsServerlessClusterProps);
    this.validateRequiredProps(props || ({} as RDSProps));

    this.engine = engine;
    this.types = props.types;
    this.defaultDatabaseName = defaultDatabaseName;
    this.cdk.cluster = new rds.ServerlessCluster(this, "Cluster", {
      clusterIdentifier: app.logicalPrefixedName(id),
      ...rdsServerlessClusterProps,
      defaultDatabaseName,
      enableDataApi: true,
      engine: this.getEngine(engine),
      scaling: this.getScaling(scaling),
      vpc: this.getVpc(rdsServerlessClusterProps),
      vpcSubnets: this.getVpcSubnets(rdsServerlessClusterProps)
    });

    ///////////////////////////
    // Create Migrations
    ///////////////////////////

    if (migrations) {
      this.validateMigrationsFileExists(migrations);

      this.migratorFunction = this.createMigrationsFunction(
        engine,
        defaultDatabaseName,
        migrations
      );
      this.createMigrationCustomResource(migrations);
    }
  }

  /**
   * The ARN of the internally created RDS Serverless Cluster.
   */
  public get clusterArn(): string {
    return this.cdk.cluster.clusterArn;
  }

  /**
   * The ARN of the internally created RDS Serverless Cluster.
   */
  public get clusterIdentifier(): string {
    return this.cdk.cluster.clusterIdentifier;
  }

  /**
   * The ARN of the internally created RDS Serverless Cluster.
   */
  public get clusterEndpoint(): rds.Endpoint {
    return this.cdk.cluster.clusterEndpoint;
  }

  /**
   * The ARN of the internally created Secrets Manager Secret.
   */
  public get secretArn(): string {
    return this.cdk.cluster.secret!.secretArn;
  }

  public getConstructMetadata() {
    return {
      type: "RDS" as const,
      data: {
        engine: this.engine,
        secretArn: this.secretArn,
        types: this.types,
        clusterArn: this.clusterArn,
        clusterIdentifier: this.clusterIdentifier,
        defaultDatabaseName: this.defaultDatabaseName,
        migrator: this.migratorFunction && getFunctionRef(this.migratorFunction)
      }
    };
  }

  private validateRDSServerlessClusterProps(
    props: RDSCdkServerlessClusterProps
  ) {
    // Validate "engine" is passed in from the top level
    if ((props as any).engine) {
      throw new Error(
        `Use "engine" instead of "cdk.cluster.engine" to configure the RDS database engine.`
      );
    }

    // Validate "defaultDatabaseName" is passed in from the top level
    if ((props as any).defaultDatabaseName) {
      throw new Error(
        `Use "defaultDatabaseName" instead of "cdk.cluster.defaultDatabaseName" to configure the RDS database engine.`
      );
    }

    // Validate "scaling" is passed in from the top level
    if ((props as any).scaling) {
      throw new Error(
        `Use "scaling" instead of "cdk.cluster.scaling" to configure the RDS database auto-scaling.`
      );
    }

    // Validate "enableDataApi" is not passed in
    if (props.enableDataApi === false) {
      throw new Error(
        `Do not configure the "cdk.cluster.enableDataApi". Data API is always enabled for this construct.`
      );
    }

    // Validate Secrets Manager is used for "credentials"
    if (props.credentials && !props.credentials.secret) {
      throw new Error(
        `Only credentials managed by SecretManager are supported for the "cdk.cluster.credentials".`
      );
    }
  }

  private validateRequiredProps(props: RDSProps) {
    if (!props.engine) {
      throw new Error(`Missing "engine" in the "${this.node.id}" RDS`);
    }

    if (!props.defaultDatabaseName) {
      throw new Error(
        `Missing "defaultDatabaseName" in the "${this.node.id}" RDS`
      );
    }
  }

  private validateMigrationsFileExists(migrations: string) {
    if (!fs.existsSync(migrations))
      throw new Error(
        `Cannot find the migrations in "${path.resolve(migrations)}".`
      );
  }

  private getEngine(engine: RDSEngineType): rds.IClusterEngine {
    if (engine === "mysql5.6") {
      return rds.DatabaseClusterEngine.aurora({
        version: rds.AuroraEngineVersion.VER_10A
      });
    } else if (engine === "mysql5.7") {
      return rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_07_1
      });
    } else if (engine === "postgresql10.14") {
      return rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_10_14
      });
    }

    throw new Error(
      `The specified "engine" is not supported for sst.RDS. Only mysql5.6, mysql5.7, and postgresql10.14 engines are currently supported.`
    );
  }

  private getScaling(
    scaling?: RDSProps["scaling"]
  ): rds.ServerlessScalingOptions {
    return {
      autoPause:
        scaling?.autoPause === false
          ? cdk.Duration.minutes(0)
          : scaling?.autoPause === true || scaling?.autoPause === undefined
          ? cdk.Duration.minutes(5)
          : cdk.Duration.minutes(scaling?.autoPause),
      minCapacity: rds.AuroraCapacityUnit[scaling?.minCapacity || "ACU_2"],
      maxCapacity: rds.AuroraCapacityUnit[scaling?.maxCapacity || "ACU_16"]
    };
  }

  private getVpc(props: RDSCdkServerlessClusterProps): ec2.IVpc {
    if (props.vpc) {
      return props.vpc;
    }

    return new ec2.Vpc(this, "vpc", {
      natGateways: 0
    });
  }

  private getVpcSubnets(
    props: RDSCdkServerlessClusterProps
  ): ec2.SubnetSelection | undefined {
    if (props.vpc) {
      return props.vpcSubnets;
    }

    return {
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED
    };
  }

  private createMigrationsFunction(
    engine: string,
    defaultDatabaseName: string,
    migrations: string
  ) {
    const app = this.node.root as App;

    // path to migration scripts inside the Lambda function
    const migrationsDestination = "sst_rds_migration_scripts";

    // fullpath of the migrator Lambda function
    // Note:
    // - when invoked from `sst build`, __dirname is `resources/dist`
    // - when running resources tests, __dirname is `resources/src`
    // For now we will do `__dirname/../dist` to make both cases work.
    const srcPath = path.resolve(path.join(__dirname, "../dist/RDS_migrator"));

    const fn = new Fn(this, "MigrationFunction", {
      srcPath,
      handler: "index.handler",
      runtime: "nodejs16.x",
      timeout: 900,
      memorySize: 1024,
      environment: {
        RDS_ARN: this.cdk.cluster.clusterArn,
        RDS_SECRET: this.cdk.cluster.secret!.secretArn,
        RDS_DATABASE: defaultDatabaseName,
        RDS_ENGINE_MODE: engine === "postgresql10.14" ? "postgres" : "mysql",
        // for live development, perserve the migrations path so the migrator
        // can locate the migration files
        RDS_MIGRATIONS_PATH: app.local ? migrations : migrationsDestination
      },
      bundle: {
        nodeModules: ["kysely", "kysely-data-api"],
        format: "esm",
        // Note that we need to generate a relative path of the migrations off the
        // srcPath because sst.Function internally builds the copy "from" path by
        // joining the srcPath and the from path.
        copyFiles: [
          {
            from: path.relative(
              path.resolve(srcPath),
              path.resolve(migrations)
            ),
            to: migrationsDestination
          }
        ]
      }
    });

    fn.attachPermissions([this.cdk.cluster]);

    return fn;
  }

  private createMigrationCustomResource(migrations: string) {
    const app = this.node.root as App;

    // Create custom resource handler
    const handler = new lambda.Function(this, "MigrationHandler", {
      code: lambda.Code.fromAsset(path.join(__dirname, "Script")),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024
    });
    this.migratorFunction?.grantInvoke(handler);

    // Note: "MigrationsHash" is generated to ensure the Custom Resource function
    //       is only run when migration files change.
    //
    //       Do not use the hash in Live mode, b/c we want the custom resource
    //       to remain the same in CloudFormation template when rebuilding
    //       infrastructure. Otherwise, there will always be a change when
    //       rebuilding infrastructure b/c the "BuildAt" property changes on
    //       each build.
    const hash = app.local ? 0 : this.generateMigrationsHash(migrations);
    new cdk.CustomResource(this, "MigrationResource", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTScript",
      properties: {
        UserCreateFunction: app.local
          ? undefined
          : this.migratorFunction?.functionName,
        UserUpdateFunction: app.local
          ? undefined
          : this.migratorFunction?.functionName,
        UserParams: JSON.stringify({}),
        MigrationsHash: hash
      }
    });
  }

  private generateMigrationsHash(migrations: string): string {
    // Get all files inside the migrations folder
    const files = glob.sync("**", {
      dot: true,
      nodir: true,
      follow: true,
      cwd: migrations
    });

    // Calculate hash of all files content
    return crypto
      .createHash("md5")
      .update(
        files.map(file => fs.readFileSync(path.join(migrations, file))).join("")
      )
      .digest("hex");
  }
}
