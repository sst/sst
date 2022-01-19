import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Script } from "./Script";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface RdsProps {
  readonly rdsServerlessCluster?: rds.ServerlessCluster | RdsCdkServerlessClusterProps;
  readonly migrations?: RdsMigrationProps;
  readonly engine: RdsEngine;
}

export type RdsEngine = "mysql5.6" | "mysql5.7" | "postgresql10.14" | rds.IClusterEngine;

export interface RdsMigrationProps {
  readonly runner: FunctionDefinition;
  readonly scripts: string;
}

export interface RdsCdkServerlessClusterProps extends Omit<rds.ServerlessClusterProps, "vpc" | "engine" > {
  readonly vpc?: ec2.IVpc;
}

/////////////////////
// Construct
/////////////////////

export class Rds extends Construct implements SSTConstruct {
  public readonly rdsServerlessCluster: rds.ServerlessCluster;
  public readonly migrationsRunnerFunction?: Fn;

  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { rdsServerlessCluster, engine, migrations } = props || {};

    ////////////////////
    // Create Bucket
    ////////////////////

    if (isCDKConstruct(rdsServerlessCluster)) {
      this.rdsServerlessCluster = rdsServerlessCluster as rds.ServerlessCluster;
    } else {
      const rdsServerlessClusterProps = (rdsServerlessCluster || {}) as RdsCdkServerlessClusterProps;

      // Validate "engine" is passed in from the top level
      if ((rdsServerlessClusterProps as any).engine) {
        throw new Error(
          `Use "engine" instead of "rdsServerlessCluster.engine" to configure the RDS database engine.`
        );
      }

      this.rdsServerlessCluster = new rds.ServerlessCluster(this, "Cluster", {
        clusterIdentifier: root.logicalPrefixedName(id),
        enableDataApi: true,
        ...rdsServerlessClusterProps,
        engine: this.getEngine(engine),
        vpc: this.getVpc(rdsServerlessClusterProps),
        vpcSubnets: this.getVpcSubnets(rdsServerlessClusterProps),
      });
    }

    ///////////////////////////
    // Create Migrations
    ///////////////////////////

    if (migrations) {
      this.migrationsRunnerFunction = this.createMigrationsRunner(scope, migrations);
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
      type: "Rds" as const,
      data: {
        name: this.clusterIdentifier,
        migrationsRunner: this.migrationsRunnerFunction && getFunctionRef(this.migrationsRunnerFunction),
      },
    };
  }

  private getEngine(engine: RdsEngine): rds.IClusterEngine {
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
      throw new Error(`Missing "engine" in the "${this.node.id}" Rds`);
    }

    return engine;
  }

  private getVpc(props: RdsCdkServerlessClusterProps): ec2.IVpc {
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

  private getVpcSubnets(props: RdsCdkServerlessClusterProps): ec2.SubnetSelection | undefined {
    if (props.vpc) {
      return props.vpcSubnets;
    }

    return {
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    };
  }

  private createMigrationsRunner(scope: Construct, migrations: RdsMigrationProps) {
    let runner;
    if (migrations.runner instanceof Fn) {
      runner = migrations.runner;
    }
    else if (typeof migrations.runner === "string") {
      runner = {
        handler: migrations.runner,
        environment: {
          RDS_ARN: this.rdsServerlessCluster.clusterArn,
          RDS_SECRET: this.rdsServerlessCluster.secret!.secretArn,
        },
        bundle: {
          copyFiles: [{ from: migrations.scripts, to: migrations.scripts }],
        },
      };
    }
    else {
      runner = {
        ...migrations.runner,
        environment: {
          ...(migrations.runner.environment || {}),
          RDS_ARN: this.rdsServerlessCluster.clusterArn,
          RDS_SECRET: this.rdsServerlessCluster.secret!.secretArn,
        },
      };
      if (runner.bundle === false) {
        // skip, let user bundle the migrations scripts
      }
      else if (runner.bundle === true || runner.bundle === undefined) {
        runner.bundle = {
          copyFiles: [{ from: migrations.scripts, to: migrations.scripts }],
        };
      }
      else {
        runner.bundle = {
          ...runner.bundle,
          copyFiles: [
            ...(runner.bundle.copyFiles || []),
            { from: migrations.scripts, to: migrations.scripts }
          ],
        };
      }
    }

    const script = new Script(scope, "Migrations", {
      onCreateAndUpdate: runner,
    });

    return script.createAndUpdateFunction;
  }
}