import path from "path";
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps } from "./Function";
import { Script } from "./Script";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface RDSProps {
  readonly rdsServerlessCluster?: rds.ServerlessCluster | RDSCdkServerlessClusterProps;
  readonly engine: RDSEngine;
  readonly defaultDatabaseName: string;
  readonly migrations?: string;
}

export type RDSEngine = "mysql5.6" | "mysql5.7" | "postgresql10.14" | rds.IClusterEngine;

export interface RDSCdkServerlessClusterProps extends Omit<rds.ServerlessClusterProps, "vpc" | "engine" | "defaultDatabaseName" > {
  readonly vpc?: ec2.IVpc;
}

/////////////////////
// Construct
/////////////////////

export class RDS extends Construct implements SSTConstruct {
  public readonly rdsServerlessCluster: rds.ServerlessCluster;
  public readonly migrationsRunnerFunction?: Fn;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { rdsServerlessCluster, engine, defaultDatabaseName, migrations } = props || {};

    ////////////////////
    // Create Bucket
    ////////////////////

    if (isCDKConstruct(rdsServerlessCluster)) {
      this.rdsServerlessCluster = rdsServerlessCluster as rds.ServerlessCluster;
    } else {
      const rdsServerlessClusterProps = (rdsServerlessCluster || {}) as RDSCdkServerlessClusterProps;

      this.assertTopLevelEngine(rdsServerlessClusterProps);
      this.assertTopLevelDefaultDatabaseName(rdsServerlessClusterProps);
      this.assertEnableDataApiTrue(rdsServerlessClusterProps);

      this.rdsServerlessCluster = new rds.ServerlessCluster(this, "Cluster", {
        clusterIdentifier: root.logicalPrefixedName(id),
        ...rdsServerlessClusterProps,
        enableDataApi: true,
        engine: this.getEngine(engine),
        vpc: this.getVpc(rdsServerlessClusterProps),
        vpcSubnets: this.getVpcSubnets(rdsServerlessClusterProps),
      });
    }

    ///////////////////////////
    // Create Migrations
    ///////////////////////////

    if (migrations) {
      this.migrationsRunnerFunction = this.createMigrationsRunner(scope, defaultDatabaseName, migrations);
      this.migrationsRunnerFunction?.attachPermissions([this.rdsServerlessCluster]);
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

  public attachPermissions(permissions: Permissions): void {
    this.migrationsRunnerFunction?.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "RDS" as const,
      data: {
        name: this.clusterIdentifier,
        migrationsRunner: this.migrationsRunnerFunction && getFunctionRef(this.migrationsRunnerFunction),
      },
    };
  }

  private assertTopLevelEngine(props: RDSCdkServerlessClusterProps) {
    // Validate "engine" is passed in from the top level
    if ((props as any).engine) {
      throw new Error(
        `Use "engine" instead of "rdsServerlessCluster.engine" to configure the RDS database engine.`
      );
    }
  }

  private assertTopLevelDefaultDatabaseName(props: RDSCdkServerlessClusterProps) {
    // Validate "defaultDatabaseName" is passed in from the top level
    if ((props as any).defaultDatabaseName) {
      throw new Error(
        `Use "defaultDatabaseName" instead of "rdsServerlessCluster.defaultDatabaseName" to configure the RDS database engine.`
      );
    }
  }

  private assertEnableDataApiTrue(props: RDSCdkServerlessClusterProps) {
    if (props.enableDataApi === false) {
      throw new Error(
        `Do not configure the "rdsServerlessCluster.enableDataApi". Data API is required for this construct.`
      );
    }
  }

  private getEngine(engine: RDSEngine): rds.IClusterEngine {
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
    else if (!engine || typeof engine === "string") {
      throw new Error(`Missing "engine" in the "${this.node.id}" RDS`);
    }

    return engine;
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

  private createMigrationsRunner(scope: Construct, defaultDatabaseName: string, migrations: string) {
    const migrationsDestination = "_rds_migrations_";
    const srcPath = path.resolve(path.join(__dirname, ".."));
    const handler = path.resolve(path.join(__dirname, "RDS/runner.handler"));
    const runner: FunctionProps = {
      srcPath,
      handler: path.relative(srcPath, handler),
      runtime: "nodejs14.x",
      environment: {
        RDS_ARN: this.rdsServerlessCluster.clusterArn,
        RDS_SECRET: this.rdsServerlessCluster.secret!.secretArn,
        RDS_DATABASE: defaultDatabaseName,
        RDS_MIGRATIONS_PATH: migrationsDestination,
      },
      bundle: {
        copyFiles: [{ from: migrations, to: migrationsDestination }],
      },
    };

    const script = new Script(scope, "Migrations", {
      onCreateAndUpdate: runner,
    });

    return script.createAndUpdateFunction;
  }
}
