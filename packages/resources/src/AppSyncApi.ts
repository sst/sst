import * as path from "path";
import * as fs from "fs-extra";
import { print } from "graphql";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { loadFilesSync } from "@graphql-tools/load-files";

import { Construct } from 'constructs';
import * as rds from "aws-cdk-lib/aws-rds";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import { App } from "./App";
import { Table } from "./Table";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface AppSyncApiProps {
  readonly graphqlApi?: appsync.IGraphqlApi | AppSyncApiCdkGraphqlProps;
  readonly dataSources?: {
    [key: string]:
      | FunctionDefinition
      | AppSyncApiLambdaDataSourceProps
      | AppSyncApiDynamoDbDataSourceProps
      | AppSyncApiRdsDataSourceProps
      | AppSyncApiHttpDataSourceProps;
  };
  readonly resolvers?: {
    [key: string]: string | FunctionDefinition | AppSyncApiResolverProps;
  };
  readonly defaultFunctionProps?: FunctionProps;
}

export interface AppSyncApiLambdaDataSourceProps {
  readonly function: FunctionDefinition;
  readonly options?: appsync.DataSourceOptions;
}

export interface AppSyncApiDynamoDbDataSourceProps {
  readonly table: Table | dynamodb.Table;
  readonly options?: appsync.DataSourceOptions;
}

export interface AppSyncApiRdsDataSourceProps {
  readonly serverlessCluster: rds.IServerlessCluster;
  readonly secretStore: secretsmanager.ISecret;
  readonly databaseName?: string;
  readonly options?: appsync.DataSourceOptions;
}

export interface AppSyncApiHttpDataSourceProps {
  readonly endpoint: string;
  readonly options?: appsync.HttpDataSourceOptions;
}

export interface AppSyncApiResolverProps {
  readonly dataSource?: string;
  readonly function?: FunctionDefinition;
  readonly resolverProps?: AppSyncApiCdkResolverProps;
}

export interface AppSyncApiCdkGraphqlProps
  extends Omit<appsync.GraphqlApiProps, "name" | "schema"> {
  readonly name?: string;
  readonly schema?: string | string[] | appsync.Schema;
}

export type AppSyncApiCdkResolverProps = Omit<
  appsync.BaseResolverProps,
  "fieldName" | "typeName"
>;

/////////////////////
// Construct
/////////////////////

export class AppSyncApi extends Construct implements SSTConstruct {
  public readonly graphqlApi: appsync.GraphqlApi;
  private readonly functionsByDsKey: { [key: string]: Fn };
  private readonly dataSourcesByDsKey: {
    [key: string]: appsync.BaseDataSource;
  };
  private readonly dsKeysByResKey: { [key: string]: string };
  private readonly resolversByResKey: { [key: string]: appsync.Resolver };
  private readonly permissionsAttachedForAllFunctions: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: Construct, id: string, props?: AppSyncApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { graphqlApi, dataSources, resolvers, defaultFunctionProps } =
      props || {};
    this.functionsByDsKey = {};
    this.dataSourcesByDsKey = {};
    this.resolversByResKey = {};
    this.dsKeysByResKey = {};
    this.permissionsAttachedForAllFunctions = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create Api
    ////////////////////

    if (isCDKConstruct(graphqlApi)) {
      this.graphqlApi = graphqlApi as appsync.GraphqlApi;
    } else {
      const graphqlApiProps = (graphqlApi || {}) as AppSyncApiCdkGraphqlProps;

      // build schema
      let mainSchema: appsync.Schema | undefined;
      if (typeof graphqlApiProps.schema === "string") {
        mainSchema = appsync.Schema.fromAsset(graphqlApiProps.schema);
      } else if (Array.isArray(graphqlApiProps.schema)) {
        if (graphqlApiProps.schema.length > 0) {
          // merge schema files
          const mergedSchema = mergeTypeDefs(
            loadFilesSync(graphqlApiProps.schema)
          );
          const filePath = path.join(
            root.buildDir,
            `appsyncapi-${id}-${this.node.addr}.graphql`
          );
          fs.writeFileSync(filePath, print(mergedSchema));
          mainSchema = appsync.Schema.fromAsset(filePath);
        }
      } else {
        mainSchema = graphqlApiProps.schema;
      }

      this.graphqlApi = new appsync.GraphqlApi(this, "Api", {
        name: root.logicalPrefixedName(id),
        xrayEnabled: true,
        ...graphqlApiProps,

        // handle schema is "string"
        schema: mainSchema,
      });
    }

    ///////////////////////////
    // Configure data sources
    ///////////////////////////

    if (dataSources) {
      Object.keys(dataSources).forEach((key: string) =>
        this.addDataSource(this, key, dataSources[key])
      );
    }

    ///////////////////////////
    // Configure resolvers
    ///////////////////////////

    if (resolvers) {
      Object.keys(resolvers).forEach((key: string) =>
        this.addResolver(this, key, resolvers[key])
      );
    }
  }

  public get url(): string {
    return this.graphqlApi.graphqlUrl;
  }

  public addDataSources(
    scope: Construct,
    dataSources: {
      [key: string]:
        | FunctionDefinition
        | AppSyncApiLambdaDataSourceProps
        | AppSyncApiDynamoDbDataSourceProps
        | AppSyncApiRdsDataSourceProps
        | AppSyncApiHttpDataSourceProps;
    }
  ): void {
    Object.keys(dataSources).forEach((key: string) => {
      // add data source
      const fn = this.addDataSource(scope, key, dataSources[key]);

      // attached existing permissions
      if (fn) {
        this.permissionsAttachedForAllFunctions.forEach((permissions) =>
          fn.attachPermissions(permissions)
        );
      }
    });
  }

  public addResolvers(
    scope: Construct,
    resolvers: {
      [key: string]: FunctionDefinition | AppSyncApiResolverProps;
    }
  ): void {
    Object.keys(resolvers).forEach((key: string) => {
      // add resolver
      const fn = this.addResolver(scope, key, resolvers[key]);

      // attached existing permissions
      if (fn) {
        this.permissionsAttachedForAllFunctions.forEach((permissions) =>
          fn.attachPermissions(permissions)
        );
      }
    });
  }

  public getConstructMetadata() {
    return {
      type: "AppSync" as const,
      data: {
        appSyncApiId: this.graphqlApi.apiId,
        dataSources: Object.entries(this.dataSourcesByDsKey).map(([key]) => ({
          name: key,
          fn: getFunctionRef(this.functionsByDsKey[key]),
        })),
      },
    };
  }

  private addDataSource(
    scope: Construct,
    dsKey: string,
    dsValue:
      | FunctionDefinition
      | AppSyncApiLambdaDataSourceProps
      | AppSyncApiDynamoDbDataSourceProps
      | AppSyncApiRdsDataSourceProps
      | AppSyncApiHttpDataSourceProps
  ): Fn | undefined {
    let dataSource;
    let lambda;

    // Lambda ds
    if ((dsValue as AppSyncApiLambdaDataSourceProps).function) {
      dsValue = dsValue as AppSyncApiLambdaDataSourceProps;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${dsKey}`,
        dsValue.function,
        this.defaultFunctionProps,
        `Cannot define defaultFunctionProps when a Function is passed in to the "${dsKey} data source`
      );
      dataSource = this.graphqlApi.addLambdaDataSource(
        dsKey,
        lambda,
        dsValue.options
      );
    }
    // DynamoDb ds
    else if ((dsValue as AppSyncApiDynamoDbDataSourceProps).table) {
      dsValue = dsValue as AppSyncApiDynamoDbDataSourceProps;
      const table =
        dsValue.table instanceof Table
          ? dsValue.table.dynamodbTable
          : dsValue.table;
      dataSource = this.graphqlApi.addDynamoDbDataSource(
        dsKey,
        table,
        dsValue.options
      );
    }
    // Rds ds
    else if ((dsValue as AppSyncApiRdsDataSourceProps).serverlessCluster) {
      dsValue = dsValue as AppSyncApiRdsDataSourceProps;
      dataSource = this.graphqlApi.addRdsDataSource(
        dsKey,
        dsValue.serverlessCluster,
        dsValue.secretStore,
        dsValue.databaseName,
        dsValue.options
      );
    }
    // Http ds
    else if ((dsValue as AppSyncApiHttpDataSourceProps).endpoint) {
      dsValue = dsValue as AppSyncApiHttpDataSourceProps;
      dataSource = this.graphqlApi.addHttpDataSource(
        dsKey,
        dsValue.endpoint,
        dsValue.options
      );
    }
    // Lambda function
    else {
      dsValue = dsValue as FunctionDefinition;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${dsKey}`,
        dsValue,
        this.defaultFunctionProps,
        `Cannot define defaultFunctionProps when a Function is passed in to the "${dsKey} data source`
      );
      dataSource = this.graphqlApi.addLambdaDataSource(dsKey, lambda);
    }
    this.dataSourcesByDsKey[dsKey] = dataSource;
    if (lambda) {
      this.functionsByDsKey[dsKey] = lambda;
    }

    return lambda;
  }

  private addResolver(
    scope: Construct,
    resKey: string,
    resValue: FunctionDefinition | AppSyncApiResolverProps
  ): Fn | undefined {
    // Normalize resKey
    resKey = this.normalizeResolverKey(resKey);

    // Get type and field
    const resolverKeyParts = resKey.split(" ");
    if (resolverKeyParts.length !== 2) {
      throw new Error(`Invalid resolver ${resKey}`);
    }
    const [typeName, fieldName] = resolverKeyParts;
    if (fieldName.length === 0) {
      throw new Error(`Invalid field defined for "${resKey}"`);
    }

    ///////////////////
    // Create data source if not created before
    ///////////////////
    let lambda;
    let dataSource;
    let dataSourceKey;
    let resolverProps;

    // DataSource key
    if (
      typeof resValue === "string" &&
      Object.keys(this.dataSourcesByDsKey).includes(resValue)
    ) {
      dataSourceKey = resValue;
      dataSource = this.dataSourcesByDsKey[resValue];
      resolverProps = {};
    }
    // DataSource key not exist (string does not have a dot, assume it is referencing a data store)
    else if (typeof resValue === "string" && resValue.indexOf(".") === -1) {
      throw new Error(
        `Failed to create resolver "${resKey}". Data source "${resValue}" does not exist.`
      );
    }
    // Lambda resolver
    else if (this.isLambdaResolverProps(resValue as AppSyncApiResolverProps)) {
      resValue = resValue as AppSyncApiResolverProps;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${typeName}_${fieldName}`,
        resValue.function as FunctionDefinition,
        this.defaultFunctionProps,
        `Cannot define defaultFunctionProps when a Function is passed in to the "${resKey} resolver`
      );
      dataSourceKey = this.buildDataSourceKey(typeName, fieldName);
      dataSource = this.graphqlApi.addLambdaDataSource(dataSourceKey, lambda);
      resolverProps = resValue.resolverProps || {};
    }
    // DataSource resolver
    else if (
      this.isDataSourceResolverProps(resValue as AppSyncApiResolverProps)
    ) {
      resValue = resValue as AppSyncApiResolverProps;
      dataSourceKey = resValue.dataSource as string;
      dataSource = this.dataSourcesByDsKey[dataSourceKey];
      resolverProps = resValue.resolverProps || {};
    }
    // Lambda function
    else {
      resValue = resValue as FunctionDefinition;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${typeName}_${fieldName}`,
        resValue,
        this.defaultFunctionProps,
        `Cannot define defaultFunctionProps when a Function is passed in to the "${resKey} resolver`
      );
      dataSourceKey = this.buildDataSourceKey(typeName, fieldName);
      dataSource = this.graphqlApi.addLambdaDataSource(dataSourceKey, lambda);
      resolverProps = {};
    }

    // Store new data source created
    if (lambda) {
      this.dataSourcesByDsKey[dataSourceKey] = dataSource;
      this.functionsByDsKey[dataSourceKey] = lambda;
    }
    this.dsKeysByResKey[resKey] = dataSourceKey;

    ///////////////////
    // Create resolver
    ///////////////////
    const resolver = this.graphqlApi.createResolver({
      dataSource,
      typeName,
      fieldName,
      ...resolverProps,
    });
    this.resolversByResKey[resKey] = resolver;

    return lambda;
  }

  private isLambdaResolverProps(object: AppSyncApiResolverProps): boolean {
    return object.function !== undefined;
  }

  private isDataSourceResolverProps(object: AppSyncApiResolverProps): boolean {
    return object.dataSource !== undefined;
  }

  private normalizeResolverKey(resolverKey: string): string {
    // remove extra spaces in the key
    return resolverKey.split(/\s+/).join(" ");
  }

  private buildDataSourceKey(typeName: string, fieldName: string): string {
    return `LambdaDS_${typeName}_${fieldName}`;
  }

  public getFunction(key: string): Fn | undefined {
    let fn = this.functionsByDsKey[key];

    if (!fn) {
      const resKey = this.normalizeResolverKey(key);
      const dsKey = this.dsKeysByResKey[resKey];
      fn = this.functionsByDsKey[dsKey];
    }
    return fn;
  }

  public getDataSource(key: string): appsync.BaseDataSource | undefined {
    let ds = this.dataSourcesByDsKey[key];

    if (!ds) {
      const resKey = this.normalizeResolverKey(key);
      const dsKey = this.dsKeysByResKey[resKey];
      ds = this.dataSourcesByDsKey[dsKey];
    }
    return ds;
  }

  public getResolver(key: string): appsync.Resolver | undefined {
    const resKey = this.normalizeResolverKey(key);
    return this.resolversByResKey[resKey];
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functionsByDsKey).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllFunctions.push(permissions);
  }

  public attachPermissionsToDataSource(
    key: string,
    permissions: Permissions
  ): void {
    const fn = this.getFunction(key);
    if (!fn) {
      throw new Error(
        `Failed to attach permissions. Function does not exist for key "${key}".`
      );
    }

    fn.attachPermissions(permissions);
  }
}
