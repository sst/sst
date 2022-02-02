import path from "path";
import * as fs from "fs-extra";
import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn } from "./Function";

/////////////////////
// Interfaces
/////////////////////

export interface RDSProps {
  readonly rdsServerlessCluster?: RDSCdkServerlessClusterProps;
  readonly engine: RDSEngineType;
  readonly defaultDatabaseName: string;
  readonly migrations?: string;
}

export type RDSEngineType = "mysql5.6" | "mysql5.7" | "postgresql10.14";

export interface RDSCdkServerlessClusterProps extends Omit<rds.ServerlessClusterProps, "vpc" | "engine" | "defaultDatabaseName" > {
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
    const { rdsServerlessCluster, engine, defaultDatabaseName, migrations } = props || {};

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
      vpc: this.getVpc(rdsServerlessClusterProps),
      vpcSubnets: this.getVpcSubnets(rdsServerlessClusterProps),
    });

    ///////////////////////////
    // Create Migrations
    ///////////////////////////

    if (migrations) {
      this.validateMigrationsFileExists(migrations);

      this.migratorFunction = this.createMigrationsFunction(engine, defaultDatabaseName, migrations);
      this.createMigrationCustomResource();
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

  private getVpc(props: RDSCdkServerlessClusterProps): ec2.IVpc {
    if (props.vpc) {
      return props.vpc;
    }

    return new ec2.Vpc(this, "vpc", {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 28,
          name: "rds",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
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

  private createMigrationCustomResource() {
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

    // Note: "BuiltAt" is set to current timestamp to ensure the Custom
    //       Resource function is run on every update.
    //
    //       Do not use the current timestamp in Live mode, b/c we want the
    //       this custom resource to remain the same in CloudFormation template
    //       when rebuilding infrastructure. Otherwise, there will always be
    //       a change when rebuilding infrastructure b/c the "BuildAt" property
    //       changes on each build.
    const builtAt = app.local ? app.debugStartedAt : Date.now();
    new cdk.CustomResource(this, "MigrationResource", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTScript",
      properties: {
        UserCreateFunction: app.local ? undefined : this.migratorFunction?.functionName,
        UserUpdateFunction: app.local ? undefined : this.migratorFunction?.functionName,
        UserParams: JSON.stringify({}),
        BuiltAt: builtAt,
      },
    });
  }
}
