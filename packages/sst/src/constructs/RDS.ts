import path from "path";
import { globSync } from "glob";
import fs from "fs";
import url from "url";
import * as crypto from "crypto";
import { Construct } from "constructs";
import { Duration as CDKDuration, CustomResource } from "aws-cdk-lib/core";
import { SubnetSelection, SubnetType, Vpc, IVpc } from "aws-cdk-lib/aws-ec2";
import {
  AuroraCapacityUnit,
  AuroraEngineVersion,
  AuroraMysqlEngineVersion,
  AuroraPostgresEngineVersion,
  DatabaseClusterEngine,
  Endpoint,
  IClusterEngine,
  IServerlessCluster,
  ServerlessCluster,
  ServerlessClusterProps,
  ServerlessScalingOptions,
} from "aws-cdk-lib/aws-rds";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import { Function as Fn } from "./Function.js";
import { BindingProps } from "./util/binding.js";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/////////////////////
// Interfaces
/////////////////////

export interface RDSTypes {
  path: string;
  camelCase?: boolean;
}

export interface RDSProps {
  /**
   * Database engine of the cluster. Cannot be changed once set.
   */
  engine:
    | "mysql5.6"
    | "mysql5.7"
    | "mysql8.0"
    | "postgresql11.13"
    | "postgresql11.16"
    | "postgresql13.12"
    | "postgresql13.9"
    | "postgresql14.10"
    | "postgresql15.5"
    | "postgresql16.1";

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
    minCapacity?: keyof typeof AuroraCapacityUnit;

    /**
     * The maximum capacity for the cluster.
     *
     * @default "ACU_16"
     */
    maxCapacity?: keyof typeof AuroraCapacityUnit;
  };

  /**
   * Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://kysely.dev/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.
   *
   * @example
   *
   * ```js
   * new RDS(stack, "Database", {
   *   engine: "postgresql11.13",
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
   *   engine: "postgresql11.13",
   *   defaultDatabaseName: "acme",
   *   migrations: "path/to/migration/scripts",
   *   types: "backend/core/sql/types.ts",
   * });
   * ```
   * @example
   * ```js
   * new RDS(stack, "Database", {
   *   engine: "postgresql11.13",
   *   defaultDatabaseName: "acme",
   *   migrations: "path/to/migration/scripts",
   *   types: {
   *     path: "backend/core/sql/types.ts",
   *     camelCase: true
   *   }
   * });
   * ```
   */
  types?: string | RDSTypes;

  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
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
     *
     * Alternatively, you can import an existing RDS Serverless v1 Cluster in your AWS account.
     *
     * @example
     * ```js
     * new RDS(stack, "Database", {
     *   cdk: {
     *     cluster: rds.ServerlessCluster.fromServerlessClusterAttributes(stack, "ICluster", {
     *       clusterIdentifier: "my-cluster",
     *     }),
     *     secret: secretsManager.Secret.fromSecretAttributes(stack, "ISecret", {
     *       secretPartialArn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
     *     }),
     *   },
     * });
     * ```
     */
    cluster?: IServerlessCluster | RDSCdkServerlessClusterProps;
    /**
     * Required when importing existing RDS Serverless v1 Cluster.
     */
    secret?: ISecret;
  };
}

export type RDSEngineType = RDSProps["engine"];

export interface RDSCdkServerlessClusterProps
  extends Omit<
    ServerlessClusterProps,
    "vpc" | "engine" | "defaultDatabaseName" | "scaling"
  > {
  vpc?: IVpc;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/).
 *
 * @example
 *
 * ```js
 * import { RDS } from "sst/constructs";
 *
 * new RDS(stack, "Database", {
 *   engine: "postgresql11.13",
 *   defaultDatabaseName: "my_database",
 * });
 * ```
 */
export class RDS extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    /**
     * The ARN of the internally created CDK ServerlessCluster instance.
     */
    cluster: ServerlessCluster;
  };
  /**
   * The ARN of the internally created CDK ServerlessCluster instance.
   */
  public migratorFunction?: Fn;
  private props: RDSProps;
  private secret: ISecret;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, props.cdk?.id || id);

    this.validateRequiredProps(props);

    this.id = id;
    this.cdk = {} as any;
    this.props = props || {};

    let { migrations, cdk } = this.props;

    // Create the cluster
    if (cdk && isCDKConstruct(cdk.cluster)) {
      this.validateCDKPropWhenIsConstruct();
      this.cdk.cluster = this.importCluster();
      this.secret = cdk.secret!;
    } else {
      this.validateCDKPropWhenIsClusterProps();
      this.cdk.cluster = this.createCluster();
      this.secret = this.cdk.cluster.secret!;
    }

    // Create the migrator function

    if (migrations) {
      this.runMigrations(migrations);
    }

    const app = this.node.root as App;
    app.registerTypes(this);
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
  public get clusterEndpoint(): Endpoint {
    return this.cdk.cluster.clusterEndpoint;
  }

  /**
   * The default database name of the RDS Serverless Cluster.
   */
  public get defaultDatabaseName(): string {
    return this.props.defaultDatabaseName;
  }

  /**
   * The ARN of the internally created Secrets Manager Secret.
   */
  public get secretArn(): string {
    return this.secret.secretArn;
  }

  public getConstructMetadata() {
    const { engine, defaultDatabaseName, types } = this.props;
    return {
      type: "RDS" as const,
      data: {
        engine,
        secretArn: this.secretArn,
        types:
          typeof types === "string"
            ? {
                path: types,
              }
            : types,
        clusterArn: this.clusterArn,
        clusterIdentifier: this.clusterIdentifier,
        defaultDatabaseName,
        migrator:
          this.migratorFunction && getFunctionRef(this.migratorFunction),
      },
    };
  }

  /** @internal */
  public getBindings(): BindingProps {
    return {
      clientPackage: "rds",
      variables: {
        clusterArn: {
          type: "plain",
          value: this.clusterArn,
        },
        secretArn: {
          type: "plain",
          value: this.secretArn,
        },
        defaultDatabaseName: {
          type: "plain",
          value: this.defaultDatabaseName,
        },
      },
      permissions: {
        "rds-data:*": [this.clusterArn],
        "secretsmanager:GetSecretValue": [
          this.secret.secretFullArn || `${this.secret.secretArn}*`,
        ],
        "secretsmanager:DescribeSecret": [
          this.secret.secretFullArn || `${this.secret.secretArn}*`,
        ],
        // grant permission to the "encryptionkey" if set
        ...(this.secret.encryptionKey
          ? {
              "kms:Decrypt": [this.secret.encryptionKey.keyArn],
            }
          : {}),
      },
    };
  }

  public runMigrations(migrations: string, database?: string) {
    this.validateMigrationsFileExists(migrations);
    this.createMigrationsFunction(migrations);
    this.createMigrationCustomResource(migrations, database);
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

  private validateCDKPropWhenIsConstruct() {
    const { cdk } = this.props;
    if (!cdk?.secret) {
      throw new Error(
        `Missing "cdk.secret" in the "${this.node.id}" RDS. You must provide a secret to import an existing RDS Serverless Cluster.`
      );
    }
  }

  private validateCDKPropWhenIsClusterProps() {
    const { cdk } = this.props;
    const props = (cdk?.cluster || {}) as RDSCdkServerlessClusterProps;

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

    // Validate Secrets Manager is used for "credentials" not password
    if (props.credentials?.password) {
      throw new Error(
        `Only credentials managed by SecretManager are supported for the "cdk.cluster.credentials".`
      );
    }

    return props;
  }

  private validateMigrationsFileExists(migrations: string) {
    if (!fs.existsSync(migrations))
      throw new Error(
        `Cannot find the migrations in "${path.resolve(migrations)}".`
      );
  }

  private getEngine(engine: RDSEngineType): IClusterEngine {
    if (engine === "mysql5.6") {
      return DatabaseClusterEngine.aurora({
        version: AuroraEngineVersion.VER_10A,
      });
    } else if (engine === "mysql5.7") {
      return DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_2_07_1,
      });
    } else if (engine === "mysql8.0") {
      return DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_3_04_0,
      });
    } else if (engine === "postgresql11.13") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_11_13,
      });
    } else if (engine === "postgresql11.16") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_11_16,
      });
    } else if (engine === "postgresql13.12") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_13_12,
      });
    } else if (engine === "postgresql13.9") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_13_9,
      });
    } else if (engine === "postgresql14.10") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_14_10,
      });
    } else if (engine === "postgresql15.5") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_15_5,
      });
    } else if (engine === "postgresql16.1") {
      return DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_16_1,
      });
    }

    throw new Error(
      `The specified "engine" is not supported for sst.RDS. Only mysql5.6, mysql5.7, postgresql11.13, postgresql11.16, postgresql13.12, and postgresql13.9 engines are currently supported.`
    );
  }

  private getScaling(scaling?: RDSProps["scaling"]): ServerlessScalingOptions {
    return {
      autoPause:
        scaling?.autoPause === false
          ? CDKDuration.minutes(0)
          : scaling?.autoPause === true || scaling?.autoPause === undefined
          ? CDKDuration.minutes(5)
          : CDKDuration.minutes(scaling?.autoPause),
      minCapacity: AuroraCapacityUnit[scaling?.minCapacity || "ACU_2"],
      maxCapacity: AuroraCapacityUnit[scaling?.maxCapacity || "ACU_16"],
    };
  }

  private getVpc(props: RDSCdkServerlessClusterProps): IVpc {
    if (props.vpc) {
      return props.vpc;
    }

    return new Vpc(this, "vpc", {
      natGateways: 0,
    });
  }

  private getVpcSubnets(
    props: RDSCdkServerlessClusterProps
  ): SubnetSelection | undefined {
    if (props.vpc) {
      return props.vpcSubnets;
    }

    return {
      subnetType: SubnetType.PRIVATE_ISOLATED,
    };
  }

  private createCluster() {
    const { engine, defaultDatabaseName, scaling, cdk } = this.props;
    const app = this.node.root as App;
    const clusterProps = (cdk?.cluster || {}) as RDSCdkServerlessClusterProps;

    return new ServerlessCluster(this, "Cluster", {
      clusterIdentifier: app.logicalPrefixedName(this.node.id),
      ...clusterProps,
      defaultDatabaseName: defaultDatabaseName,
      enableDataApi: true,
      engine: this.getEngine(engine),
      scaling: this.getScaling(scaling),
      vpc: this.getVpc(clusterProps),
      vpcSubnets: this.getVpcSubnets(clusterProps),
    });
  }

  private importCluster() {
    const { cdk } = this.props;
    return cdk!.cluster as ServerlessCluster;
  }

  private createMigrationsFunction(migrations: string) {
    const { engine, defaultDatabaseName } = this.props;
    const app = this.node.root as App;

    // path to migration scripts inside the Lambda function
    const migrationsDestination = "sst_rds_migration_scripts";

    // fullpath of the migrator Lambda function
    // Note:
    // - when invoked from `sst build`, __dirname is `resources/dist`
    // - when running resources tests, __dirname is `resources/src`
    // For now we will do `__dirname/../dist` to make both cases work.

    this.migratorFunction = new Fn(this, "MigrationFunction", {
      handler: path.resolve(
        path.join(__dirname, "../support/rds-migrator/index.handler")
      ),
      runtime: "nodejs18.x",
      timeout: 900,
      memorySize: 1024,
      environment: {
        RDS_ARN: this.cdk.cluster.clusterArn,
        RDS_SECRET: this.cdk.cluster.secret!.secretArn,
        RDS_DATABASE: defaultDatabaseName,
        RDS_ENGINE_MODE: engine.includes("postgres") ? "postgres" : "mysql",
        // for live development, perserve the migrations path so the migrator
        // can locate the migration files
        RDS_MIGRATIONS_PATH:
          app.mode === "dev" ? migrations : migrationsDestination,
      },
      permissions: [this.cdk.cluster],
      // Note that we need to generate a relative path of the migrations off the
      // srcPath because sst.Function internally builds the copy "from" path by
      // joining the srcPath and the from path.
      copyFiles: [
        {
          from: migrations,
          to: migrationsDestination,
        },
      ],
      nodejs: {
        install: ["kysely", "kysely-data-api"],
        format: "esm",
      },
      _doNotAllowOthersToBind: true,
    });
    this.migratorFunction._overrideMetadataHandler =
      "rds-migrator/index.handler";
  }

  private createMigrationCustomResource(migrations: string, database?: string) {
    const app = this.node.root as App;

    // Create custom resource handler
    const handler = new Function(this, "MigrationHandler", {
      code: Code.fromAsset(path.join(__dirname, "../support/script-function")),
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      timeout: CDKDuration.minutes(15),
      memorySize: 1024,
      initialPolicy: [
        new PolicyStatement({
          actions: ["cloudformation:DescribeStacks"],
          resources: [Stack.of(this).stackId],
        }),
      ],
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
    const hash =
      app.mode === "dev" ? 0 : this.generateMigrationsHash(migrations);
    new CustomResource(this, "MigrationResource", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTScript",
      properties: {
        UserCreateFunction:
          app.mode === "dev" ? undefined : this.migratorFunction?.functionName,
        UserUpdateFunction:
          app.mode === "dev" ? undefined : this.migratorFunction?.functionName,
        UserParams: JSON.stringify({ database }),
        MigrationsHash: hash,
      },
    });
  }

  private generateMigrationsHash(migrations: string): string {
    // Get all files inside the migrations folder
    const files = globSync("**", {
      dot: true,
      nodir: true,
      follow: true,
      cwd: migrations,
      ignore: ["**/node_modules/**"],
    });

    // Calculate hash of all files content
    return crypto
      .createHash("md5")
      .update(
        files
          .map((file) => fs.readFileSync(path.join(migrations, file)))
          .join("")
      )
      .digest("hex");
  }
}
