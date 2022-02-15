import path from "path";
import glob from "glob";
import * as fs from "fs-extra";
import * as crypto from "crypto";
import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App } from "./App";
import { getFunctionRef, SSTConstruct } from "./Construct";
import { Function as Fn } from "./Function";

/////////////////////
// Interfaces
/////////////////////

export interface RDSProps {
  /**
   * Additional properties for the cluster.
   */
  rdsServerlessCluster?: RDSCdkServerlessClusterProps;

  /**
   * Database engine of the cluster.
   */
  engine: RDSEngineType;

  /**
   * Name of a database which is automatically created inside the cluster
   */
  defaultDatabaseName: string;

  /**
   * Scaling configuration of the cluster.
   *
   * @default - The cluster is automatically paused after 5 minutes of being idle.
   * minimum capacity: 2 ACU
   * maximum capacity: 16 ACU
   */
  scaling?: RDSScalingProps;

  /**
   * Path to the directory that contains the migration scripts.
   *
   * @default - Migrations not automatically run on deploy.
   */
  migrations?: string;
}

export interface RDSScalingProps {
  /**
   * The time before the cluster is paused.
   *
   * Pass in true to pause after 5 minutes of inactive. And pass in false to
   * disable pausing.
   *
   * Or pass in the number of minutes to wait before the cluster is paused.
   *
   * @default - true
   */
  autoPause?: boolean | number;

  /**
   * The minimum capacity for the cluster.
   *
   * @default - ACU_2
   */
  minCapacity?: keyof typeof rds.AuroraCapacityUnit;

  /**
   * The maximum capacity for the cluster.
   *
   * @default - ACU_16
   */
  maxCapacity?: keyof typeof rds.AuroraCapacityUnit;
}

export type RDSEngineType = "mysql5.6" | "mysql5.7" | "postgresql10.14";

export interface RDSCdkServerlessClusterProps extends Omit<rds.ServerlessClusterProps, "vpc" | "engine" | "defaultDatabaseName" | "scaling" > {
  readonly vpc?: ec2.IVpc;
}

/////////////////////
// Construct
/////////////////////

export class RDS extends Construct implements SSTConstruct {
  public readonly rdsServerlessCluster: rds.ServerlessCluster;
  public readonly migratorFunction?: Fn;
  private readonly engine: string;
  private readonly defaultDatabaseName: string;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, id);

    const app = scope.node.root as App;
    const { rdsServerlessCluster, engine, defaultDatabaseName, scaling, migrations } = props || {};

    ////////////////////
    // Create Bucket
    ////////////////////

    const rdsServerlessClusterProps = (rdsServerlessCluster || {}) as RDSCdkServerlessClusterProps;

    this.validateRDSServerlessClusterProps(rdsServerlessClusterProps);
    this.validateRequiredProps(props || {});

    this.engine = engine;
    this.defaultDatabaseName = defaultDatabaseName;
    this.rdsServerlessCluster = new rds.ServerlessCluster(this, "Cluster", {
      clusterIdentifier: app.logicalPrefixedName(id),
      ...rdsServerlessClusterProps,
      defaultDatabaseName,
      enableDataApi: true,
      engine: this.getEngine(engine),
      scaling: this.getScaling(scaling),
      vpc: this.getVpc(rdsServerlessClusterProps),
      vpcSubnets: this.getVpcSubnets(rdsServerlessClusterProps),
    });

    ///////////////////////////
    // Create Migrations
    ///////////////////////////

    if (migrations) {
      this.validateMigrationsFileExists(migrations);

      this.migratorFunction = this.createMigrationsFunction(engine, defaultDatabaseName, migrations);
      this.createMigrationCustomResource(migrations);
    }
  }

  public get clusterArn(): string {
    return this.rdsServerlessCluster.clusterArn;
  }

  public get clusterIdentifier(): string {
    return this.rdsServerlessCluster.clusterIdentifier;
  }

  public get clusterEndpoint(): rds.Endpoint {
    return this.rdsServerlessCluster.clusterEndpoint;
  }

  public get secretArn(): string {
    return this.rdsServerlessCluster.secret!.secretArn;
  }

  public getConstructMetadata() {
    return {
      type: "RDS" as const,
      data: {
        engine: this.engine,
        secretArn: this.secretArn,
        clusterArn: this.clusterArn,
        clusterIdentifier: this.clusterIdentifier,
        defaultDatabaseName: this.defaultDatabaseName,
        migrator: this.migratorFunction && getFunctionRef(this.migratorFunction),
      },
    };
  }

  private validateRDSServerlessClusterProps(props: RDSCdkServerlessClusterProps) {
    // Validate "engine" is passed in from the top level
    if ((props as any).engine) {
      throw new Error(
        `Use "engine" instead of "rdsServerlessCluster.engine" to configure the RDS database engine.`
      );
    }

    // Validate "defaultDatabaseName" is passed in from the top level
    if ((props as any).defaultDatabaseName) {
      throw new Error(
        `Use "defaultDatabaseName" instead of "rdsServerlessCluster.defaultDatabaseName" to configure the RDS database engine.`
      );
    }

    // Validate "scaling" is passed in from the top level
    if ((props as any).scaling) {
      throw new Error(
        `Use "scaling" instead of "rdsServerlessCluster.scaling" to configure the RDS database auto-scaling.`
      );
    }

    // Validate "enableDataApi" is not passed in
    if (props.enableDataApi === false) {
      throw new Error(
        `Do not configure the "rdsServerlessCluster.enableDataApi". Data API is always enabled for this construct.`
      );
    }
  }

  private validateRequiredProps(props: RDSProps) {
    if (!props.engine) {
      throw new Error(`Missing "engine" in the "${this.node.id}" RDS`);
    }

    if (!props.defaultDatabaseName) {
      throw new Error(`Missing "defaultDatabaseName" in the "${this.node.id}" RDS`);
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
        version: rds.AuroraEngineVersion.VER_10A,
      });
    }
    else if (engine === "mysql5.7") {
      return rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_07_1,
      });
    }
    else if (engine === "postgresql10.14") {
      return rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_10_14,
      });
    }

    throw new Error(
      `The specified "engine" is not supported for sst.RDS. Only mysql5.6, mysql5.7, and postgresql10.14 engines are currently supported.`
    );
  }

  private getScaling(scaling?: RDSScalingProps): rds.ServerlessScalingOptions {
    return {
      autoPause: scaling?.autoPause === false
        ? cdk.Duration.minutes(0)
        : (scaling?.autoPause === true || scaling?.autoPause === undefined)
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
      natGateways: 0,
    })
  }

  private getVpcSubnets(props: RDSCdkServerlessClusterProps): ec2.SubnetSelection | undefined {
    if (props.vpc) {
      return props.vpcSubnets;
    }

    return {
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    };
  }

  private createMigrationsFunction(engine: string, defaultDatabaseName: string, migrations: string) {
    const app = this.node.root as App;

    // path to migration scripts inside the Lambda function
    const migrationsDestination = "sst_rds_migration_scripts";

    // fullpath of the migrator Lambda function
    // Note:
    // - when invoked from `sst build`, __dirname is `resources/dist`
    // - when running resources tests, __dirname is `resources/src`
    // For now we will do `__dirname/../dist` to make both cases work.
    const srcPath = path.resolve(path.join(__dirname, "..", "dist", "RDS_migrator"));

    const fn = new Fn(this, "MigrationFunction", {
      srcPath,
      handler: "index.handler",
      runtime: "nodejs14.x",
      timeout: 900,
      memorySize: 1024,
      environment: {
        RDS_ARN: this.rdsServerlessCluster.clusterArn,
        RDS_SECRET: this.rdsServerlessCluster.secret!.secretArn,
        RDS_DATABASE: defaultDatabaseName,
        RDS_ENGINE_MODE: engine === "postgresql10.14" ? "postgres" : "mysql",
        // for live development, perserve the migrations path so the migrator
        // can locate the migration files
        RDS_MIGRATIONS_PATH: app.local
          ? migrations
          : migrationsDestination,
      },
      bundle: {
        // Note that we need to generate a relative path of the migrations off the
        // srcPath because sst.Function internally builds the copy "from" path by
        // joining the srcPath and the from path.
        copyFiles: [{
          from: path.relative(path.resolve(srcPath), path.resolve(migrations)),
          to: migrationsDestination,
        }],
      },
    });

    fn.attachPermissions([this.rdsServerlessCluster]);

    return fn;
  }

  private createMigrationCustomResource(migrations: string) {
    const app = this.node.root as App;

    // Create custom resource handler
    const handler = new lambda.Function(this, "MigrationHandler", {
      code: lambda.Code.fromAsset(path.join(__dirname, "Script")),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
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
        UserCreateFunction: app.local ? undefined : this.migratorFunction?.functionName,
        UserUpdateFunction: app.local ? undefined : this.migratorFunction?.functionName,
        UserParams: JSON.stringify({}),
        MigrationsHash: hash,
      },
    });
  }

  private generateMigrationsHash(migrations: string): string {
    // Get all files inside the migrations folder
    const files = glob.sync("**", {
      dot: true,
      nodir: true,
      follow: true,
      cwd: migrations,
    });

    // Calculate hash of all files content
    return crypto
      .createHash("md5")
      .update(files.map((file) =>
        fs.readFileSync(path.join(migrations, file))
      ).join(""))
      .digest("hex");
  }
}
