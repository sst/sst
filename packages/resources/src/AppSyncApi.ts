import * as path from "path";
import * as fs from "fs-extra";
import { print } from "graphql";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { loadFilesSync } from "@graphql-tools/load-files";

import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import { App } from "./App";
import { Table } from "./Table";
import { RDS } from "./RDS";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface AppSyncApiProps {
  cdk?: {
    graphqlApi?: appsync.IGraphqlApi | AppSyncApiCdkGraphqlProps;
  };
  dataSources?: {
    [key: string]:
      | FunctionInlineDefinition
      | AppSyncApiLambdaDataSourceProps
      | AppSyncApiDynamoDbDataSourceProps
      | AppSyncApiRdsDataSourceProps
      | AppSyncApiHttpDataSourceProps;
  };
  resolvers?: {
    [key: string]: string | FunctionInlineDefinition | AppSyncApiResolverProps;
  };
  defaults?: {
    function?: FunctionProps;
  };
}

export interface AppSyncApiBaseDataSourceProps {
  name?: string;
  description?: string;
}

export interface AppSyncApiLambdaDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  type?: "function";
  function: FunctionDefinition;
}

export interface AppSyncApiDynamoDbDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  type: "dynamodb";
  table?: Table;
  cdk?: {
    dataSource?: {
      table: dynamodb.Table;
    };
  };
}

export interface AppSyncApiRdsDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  type: "rds";
  rds?: RDS;
  databaseName?: string;
  cdk?: {
    dataSource?: {
      serverlessCluster: rds.IServerlessCluster;
      secretStore: secretsmanager.ISecret;
      databaseName?: string;
    };
  };
}

export interface AppSyncApiHttpDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  type: "http";
  endpoint: string;
  cdk?: {
    dataSource?: {
      authorizationConfig?: appsync.AwsIamConfig;
    };
  };
}

export interface AppSyncApiResolverProps {
  dataSource?: string;
  function?: FunctionDefinition;
  requestMapping?: MappingTemplate;
  responseMapping?: MappingTemplate;
  cdk?: {
    resolver: Omit<
      appsync.ResolverProps,
      "api" | "fieldName" | "typeName" | "dataSource"
    >;
  };
}

type MappingTemplate = MappingTemplateFile | MappingTemplateInline;
interface MappingTemplateFile {
  file: string;
}
interface MappingTemplateInline {
  inline: string;
}

export interface AppSyncApiCdkGraphqlProps
  extends Omit<appsync.GraphqlApiProps, "name" | "schema"> {
  name?: string;
  schema?: string | string[] | appsync.Schema;
}

/////////////////////
// Construct
/////////////////////

export class AppSyncApi extends Construct implements SSTConstruct {
  public readonly cdk: {
    graphqlApi: appsync.GraphqlApi;
  };
  readonly functionsByDsKey: { [key: string]: Fn };
  readonly dataSourcesByDsKey: {
    [key: string]: appsync.BaseDataSource;
  };
  readonly dsKeysByResKey: { [key: string]: string };
  readonly resolversByResKey: { [key: string]: appsync.Resolver };
  readonly permissionsAttachedForAllFunctions: Permissions[];
  readonly props: AppSyncApiProps;

  constructor(scope: Construct, id: string, props?: AppSyncApiProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.functionsByDsKey = {};
    this.dataSourcesByDsKey = {};
    this.resolversByResKey = {};
    this.dsKeysByResKey = {};
    this.permissionsAttachedForAllFunctions = [];

    this.createGraphApi();

    // Configure data sources
    if (props?.dataSources) {
      for (const key of Object.keys(props.dataSources)) {
        this.addDataSource(this, key, props.dataSources[key]);
      }
    }

    // Configure resolvers
    if (props?.resolvers) {
      for (const key of Object.keys(props.resolvers)) {
        this.addResolver(this, key, props.resolvers[key]);
      }
    }
  }

  public get url(): string {
    return this.cdk.graphqlApi.graphqlUrl;
  }

  public addDataSources(
    scope: Construct,
    dataSources: {
      [key: string]:
        | FunctionInlineDefinition
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
      [key: string]: FunctionInlineDefinition | AppSyncApiResolverProps;
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
        url: this.cdk.graphqlApi.graphqlUrl,
        appSyncApiId: this.cdk.graphqlApi.apiId,
        dataSources: Object.entries(this.dataSourcesByDsKey).map(([key]) => ({
          name: key,
          fn: getFunctionRef(this.functionsByDsKey[key]),
        })),
      },
    };
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

  private createGraphApi() {
    const { cdk } = this.props;
    const id = this.node.id;
    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.graphqlApi)) {
      this.cdk.graphqlApi = cdk?.graphqlApi as appsync.GraphqlApi;
    } else {
      const graphqlApiProps = (cdk?.graphqlApi ||
        {}) as AppSyncApiCdkGraphqlProps;

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
            app.buildDir,
            `appsyncapi-${id}-${this.node.addr}.graphql`
          );
          fs.writeFileSync(filePath, print(mergedSchema));
          mainSchema = appsync.Schema.fromAsset(filePath);
        }
      } else {
        mainSchema = graphqlApiProps.schema;
      }

      this.cdk.graphqlApi = new appsync.GraphqlApi(this, "Api", {
        name: app.logicalPrefixedName(id),
        xrayEnabled: true,
        ...graphqlApiProps,

        // handle schema is "string"
        schema: mainSchema,
      });
    }
  }

  private addDataSource(
    scope: Construct,
    dsKey: string,
    dsValue:
      | FunctionInlineDefinition
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
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${dsKey} data source`
      );
      dataSource = this.cdk.graphqlApi.addLambdaDataSource(dsKey, lambda, {
        name: dsValue.name,
        description: dsValue.description,
      });
    }
    // DynamoDb ds
    else if (
      (dsValue as AppSyncApiDynamoDbDataSourceProps).table ||
      (dsValue as AppSyncApiDynamoDbDataSourceProps).cdk?.dataSource?.table
    ) {
      dsValue = dsValue as AppSyncApiDynamoDbDataSourceProps;
      dataSource = this.cdk.graphqlApi.addDynamoDbDataSource(
        dsKey,
        dsValue.table
          ? dsValue.table.cdk.table
          : dsValue.cdk?.dataSource?.table!,
        {
          name: dsValue.name,
          description: dsValue.description,
        }
      );
    }
    // Rds ds
    else if (
      (dsValue as AppSyncApiRdsDataSourceProps).rds ||
      (dsValue as AppSyncApiRdsDataSourceProps).cdk?.dataSource
        ?.serverlessCluster
    ) {
      dsValue = dsValue as AppSyncApiRdsDataSourceProps;
      dataSource = this.cdk.graphqlApi.addRdsDataSource(
        dsKey,
        dsValue.rds
          ? dsValue.rds.cdk.cluster
          : dsValue.cdk?.dataSource?.serverlessCluster!,
        dsValue.rds
          ? dsValue.rds.cdk.cluster.secret!
          : dsValue.cdk?.dataSource?.secretStore!,
        dsValue.rds
          ? dsValue.databaseName || dsValue.rds.defaultDatabaseName
          : dsValue.cdk?.dataSource?.databaseName,
        {
          name: dsValue.name,
          description: dsValue.description,
        }
      );
    }
    // Http ds
    else if ((dsValue as AppSyncApiHttpDataSourceProps).endpoint) {
      dsValue = dsValue as AppSyncApiHttpDataSourceProps;
      dataSource = this.cdk.graphqlApi.addHttpDataSource(
        dsKey,
        dsValue.endpoint,
        {
          name: dsValue.name,
          description: dsValue.description,
        }
      );
    }
    // Lambda function
    else {
      dsValue = dsValue as FunctionInlineDefinition;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${dsKey}`,
        dsValue,
        this.props.defaults?.function,
        `Cannot define default.function when a Function is passed in to the "${dsKey} data source`
      );
      dataSource = this.cdk.graphqlApi.addLambdaDataSource(dsKey, lambda);
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
    resValue: FunctionInlineDefinition | AppSyncApiResolverProps
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
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${resKey} resolver`
      );
      dataSourceKey = this.buildDataSourceKey(typeName, fieldName);
      dataSource = this.cdk.graphqlApi.addLambdaDataSource(
        dataSourceKey,
        lambda
      );
      resolverProps = {
        requestMappingTemplate: this.buildMappingTemplate(
          resValue.requestMapping
        ),
        responseMappingTemplate: this.buildMappingTemplate(
          resValue.responseMapping
        ),
        ...resValue.cdk?.resolver,
      };
    }
    // DataSource resolver
    else if (
      this.isDataSourceResolverProps(resValue as AppSyncApiResolverProps)
    ) {
      resValue = resValue as AppSyncApiResolverProps;
      dataSourceKey = resValue.dataSource as string;
      dataSource = this.dataSourcesByDsKey[dataSourceKey];
      resolverProps = {
        requestMappingTemplate: this.buildMappingTemplate(
          resValue.requestMapping
        ),
        responseMappingTemplate: this.buildMappingTemplate(
          resValue.responseMapping
        ),
        ...resValue.cdk?.resolver,
      };
    }
    // Lambda function
    else {
      resValue = resValue as FunctionInlineDefinition;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${typeName}_${fieldName}`,
        resValue,
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${resKey} resolver`
      );
      dataSourceKey = this.buildDataSourceKey(typeName, fieldName);
      dataSource = this.cdk.graphqlApi.addLambdaDataSource(
        dataSourceKey,
        lambda
      );
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
    const resolver = this.cdk.graphqlApi.createResolver({
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

  private buildMappingTemplate(mapping?: MappingTemplate) {
    if (!mapping) {
      return undefined;
    }

    if ((mapping as MappingTemplateFile).file) {
      return appsync.MappingTemplate.fromFile(
        (mapping as MappingTemplateFile).file
      );
    }

    return appsync.MappingTemplate.fromString(
      (mapping as MappingTemplateInline).inline
    );
  }

  private buildDataSourceKey(typeName: string, fieldName: string): string {
    return `LambdaDS_${typeName}_${fieldName}`;
  }
}
