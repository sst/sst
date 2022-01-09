import { Construct } from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { getChildLogger } from "@serverless-stack/core";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { KinesisStream } from "./KinesisStream";
import { Permissions } from "./util/permission";

const logger = getChildLogger("resources");

export enum TableFieldType {
  BINARY = dynamodb.AttributeType.BINARY,
  NUMBER = dynamodb.AttributeType.NUMBER,
  STRING = dynamodb.AttributeType.STRING,
}

/////////////////////
// Interfaces
/////////////////////

export interface TableProps {
  readonly fields?: Record<string, TableFieldType>;
  readonly primaryIndex?: TableGlobalIndexProps;
  /**
   * @deprecated Use globalIndexes
   */
  readonly secondaryIndexes?: Record<string, TableGlobalIndexProps>;
  readonly globalIndexes?: Record<string, TableGlobalIndexProps>;
  readonly localIndexes?: Record<string, TableLocalIndexProps>;
  readonly dynamodbTable?: dynamodb.ITable | TableCdkProps;
  readonly kinesisStream?: KinesisStream;
  readonly stream?: boolean | dynamodb.StreamViewType;
  readonly consumers?: {
    [consumerName: string]: FunctionDefinition | TableConsumerProps;
  };
  readonly defaultFunctionProps?: FunctionProps;
}

export interface TableConsumerProps {
  readonly function: FunctionDefinition;
  readonly consumerProps?: lambdaEventSources.DynamoEventSourceProps;
}

export type TableLocalIndexProps = {
  readonly sortKey: string;
  readonly indexProps?: Omit<
    dynamodb.LocalSecondaryIndexProps,
    keyof TableLocalIndexProps | "indexName"
  >;
};

export type TableGlobalIndexProps = {
  readonly partitionKey: string;
  readonly sortKey?: string;
  readonly indexProps?: TableCdkIndexProps;
};

// Old export
export type TableIndexProps = TableGlobalIndexProps;

export type TableCdkProps = Omit<
  dynamodb.TableProps,
  "partitionKey" | "sortKey"
>;

export type TableCdkIndexProps = Omit<
  dynamodb.GlobalSecondaryIndexProps,
  "indexName" | "partitionKey" | "sortKey"
>;

/////////////////////
// Construct
/////////////////////

export class Table extends Construct implements SSTConstruct {
  public readonly dynamodbTable: dynamodb.Table;
  private readonly dynamodbTableType: "CREATED" | "IMPORTED";
  private functions: { [consumerName: string]: Fn };
  private readonly permissionsAttachedForAllConsumers: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly stream?: dynamodb.StreamViewType;
  private readonly fields?: Record<string, TableFieldType>;

  constructor(scope: Construct, id: string, props: TableProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      fields,
      primaryIndex,
      globalIndexes,
      localIndexes,
      secondaryIndexes,
      dynamodbTable,
      kinesisStream,
      stream,
      consumers,
      defaultFunctionProps,
    } = props;
    this.functions = {};
    this.fields = fields;
    this.permissionsAttachedForAllConsumers = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Input Validation
    ////////////////////
    if (consumers) this.checkDeprecatedConsumers(consumers);
    if (secondaryIndexes) this.checkDeprecatedSecondaryIndexes();
    this.validateFieldsAndIndexes(id, props);

    ////////////////////
    // Create Table
    ////////////////////
    if (isCDKConstruct(dynamodbTable)) {
      // Validate "fields" is not configured
      if (fields !== undefined) {
        throw new Error(
          `Cannot configure the "fields" when "dynamodbTable" is a construct in the "${id}" Table`
        );
      }

      // Validate "stream" is not configured
      if (stream !== undefined) {
        throw new Error(
          `Cannot configure the "stream" when "dynamodbTable" is a construct in the "${id}" Table`
        );
      }

      this.dynamodbTableType = "IMPORTED";
      this.dynamodbTable = dynamodbTable as dynamodb.Table;
    } else {
      let dynamodbTableProps = (dynamodbTable || {}) as dynamodb.TableProps;

      // Validate "fields" is configured
      if (fields === undefined) {
        throw new Error(`Missing "fields" in the "${id}" Table`);
      }

      // Validate dynamodbTableProps does not contain "partitionKey", "sortKey" and "stream"
      if (dynamodbTableProps.partitionKey) {
        throw new Error(
          `Cannot configure the "dynamodbTableProps.partitionKey" in the "${id}" Table`
        );
      }
      if (dynamodbTableProps.sortKey) {
        throw new Error(
          `Cannot configure the "dynamodbTableProps.sortKey" in the "${id}" Table`
        );
      }
      if (dynamodbTableProps.stream) {
        throw new Error(
          `Cannot configure the "dynamodbTableProps.stream" in the "${id}" Table`
        );
      }

      if (fields && primaryIndex) {
        dynamodbTableProps = {
          ...dynamodbTableProps,
          partitionKey: this.buildAttribute(fields, primaryIndex.partitionKey),
          sortKey: primaryIndex.sortKey
            ? this.buildAttribute(fields, primaryIndex.sortKey)
            : undefined,
        };
      }

      this.dynamodbTableType = "CREATED";
      this.dynamodbTable = new dynamodb.Table(this, "Table", {
        tableName: root.logicalPrefixedName(id),
        pointInTimeRecovery: true,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        stream: this.buildStreamConfig(stream),
        ...(dynamodbTableProps as dynamodb.TableProps),
      });
    }

    //////////////////////////////
    // Create Secondary Indexes
    //////////////////////////////
    const allGlobalIndexes = globalIndexes || secondaryIndexes;
    if (allGlobalIndexes) this.addGlobalIndexes(allGlobalIndexes);
    if (localIndexes) this.addLocalIndexes(localIndexes);

    ///////////////////////////
    // Create Consumers
    ///////////////////////////
    if (consumers) {
      Object.keys(consumers).forEach((consumerName: string) =>
        this.addConsumer(this, consumerName, consumers[consumerName])
      );
    }

    // Create Kinesis Stream
    this.buildKinesisStreamSpec(kinesisStream);
  }

  public addGlobalIndexes(
    secondaryIndexes: NonNullable<TableProps["globalIndexes"]>
  ) {
    if (!this.fields)
      throw new Error(
        `Cannot add secondary indexes to "${this.node.id}" Table without defining "fields"`
      );
    for (const [
      indexName,
      { partitionKey, sortKey, indexProps },
    ] of Object.entries(secondaryIndexes)) {
      // Validate indexProps does not contain "indexName", "partitionKey" and "sortKey"
      if ((indexProps as dynamodb.GlobalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((indexProps as dynamodb.GlobalSecondaryIndexProps)?.partitionKey) {
        throw new Error(
          `Cannot configure the "indexProps.partitionKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((indexProps as dynamodb.GlobalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      this.dynamodbTable.addGlobalSecondaryIndex({
        indexName,
        partitionKey: this.buildAttribute(this.fields, partitionKey),
        sortKey: sortKey
          ? this.buildAttribute(this.fields, sortKey)
          : undefined,
        ...indexProps,
      });
    }
  }

  public addLocalIndexes(
    secondaryIndexes: NonNullable<TableProps["localIndexes"]>
  ) {
    if (!this.fields)
      throw new Error(
        `Cannot add local secondary indexes to "${this.node.id}" Table without defining "fields"`
      );
    for (const [indexName, { sortKey, indexProps }] of Object.entries(
      secondaryIndexes!
    )) {
      // Validate indexProps does not contain "indexName", "partitionKey" and "sortKey"
      if ((indexProps as dynamodb.LocalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((indexProps as dynamodb.LocalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      this.dynamodbTable.addLocalSecondaryIndex({
        indexName,
        sortKey: this.buildAttribute(this.fields, sortKey),
        ...indexProps,
      });
    }
  }

  public get tableArn(): string {
    return this.dynamodbTable.tableArn;
  }

  public get tableName(): string {
    return this.dynamodbTable.tableName;
  }

  public addConsumers(
    scope: Construct,
    consumers: {
      [consumerName: string]: FunctionDefinition | TableConsumerProps;
    }
  ): void {
    // Handle deprecated consumers
    this.checkDeprecatedConsumers(consumers);

    Object.keys(consumers).forEach((consumerName: string) => {
      this.addConsumer(scope, consumerName, consumers[consumerName]);
    });
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllConsumers.push(permissions);
  }

  public attachPermissionsToConsumer(
    consumerName: string,
    permissions: Permissions
  ): void {
    if (!this.functions[consumerName]) {
      throw new Error(
        `The "${consumerName}" consumer was not found in the "${this.node.id}" Table.`
      );
    }

    this.functions[consumerName].attachPermissions(permissions);
  }

  public getFunction(consumerName: string): Fn | undefined {
    return this.functions[consumerName];
  }

  public getConstructMetadata() {
    return {
      type: "Table" as const,
      data: {
        tableName: this.dynamodbTable.tableName,
        consumers: Object.entries(this.functions).map(([name, fun]) => ({
          name,
          fn: getFunctionRef(fun),
        })),
      },
    };
  }

  private addConsumer(
    scope: Construct,
    consumerName: string,
    consumer: FunctionDefinition | TableConsumerProps
  ): Fn {
    // validate stream enabled
    // note: if table is imported, do not check because we want to allow ppl to
    //       import without specifying the "tableStreamArn". And let them add
    //       consumers to it.
    if (!this.dynamodbTable.tableStreamArn) {
      const errorMsgs = [
        `Please enable the "stream" option to add consumers to the "${this.node.id}" Table.`,
      ];
      if (this.dynamodbTableType === "IMPORTED") {
        errorMsgs.push(
          `To import a table with stream enabled, use the "Table.fromTableAttributes()" method, and set the "tableStreamArn" in the attributes.`
        );
      }
      throw new Error(errorMsgs.join(" "));
    }

    // parse consumer
    let consumerFunction, consumerProps;
    if ((consumer as TableConsumerProps).function) {
      consumer = consumer as TableConsumerProps;
      consumerFunction = consumer.function;
      consumerProps = consumer.consumerProps;
    } else {
      consumerFunction = consumer as FunctionDefinition;
    }
    consumerProps = {
      startingPosition: lambda.StartingPosition.LATEST,
      ...(consumerProps || {}),
    };

    // create function
    const fn = Fn.fromDefinition(
      scope,
      consumerName,
      consumerFunction,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaultFunctionProps" to them.`
    );
    this.functions[consumerName] = fn;

    // create event source
    const eventSource = new lambdaEventSources.DynamoEventSource(
      this.dynamodbTable,
      consumerProps
    );
    fn.addEventSource(eventSource);

    // attach permissions
    this.permissionsAttachedForAllConsumers.forEach((permissions) => {
      fn.attachPermissions(permissions);
    });

    return fn;
  }

  private buildAttribute(
    fields: { [key: string]: TableFieldType },
    name: string
  ): dynamodb.Attribute {
    return {
      name,
      type: this.convertTableFieldTypeToAttributeType(fields[name]),
    };
  }

  private buildStreamConfig(
    stream?: boolean | dynamodb.StreamViewType
  ): dynamodb.StreamViewType | undefined {
    if (stream === true) {
      return dynamodb.StreamViewType.NEW_AND_OLD_IMAGES;
    } else if (stream === false) {
      return undefined;
    }

    return stream;
  }

  private convertTableFieldTypeToAttributeType(
    fieldType: TableFieldType
  ): dynamodb.AttributeType {
    if (fieldType === TableFieldType.BINARY) {
      return dynamodb.AttributeType.BINARY;
    } else if (fieldType === TableFieldType.NUMBER) {
      return dynamodb.AttributeType.NUMBER;
    } else {
      return dynamodb.AttributeType.STRING;
    }
  }

  private buildKinesisStreamSpec(kinesisStream?: KinesisStream): void {
    if (!kinesisStream) {
      return;
    }

    const cfTable = this.dynamodbTable.node.defaultChild as dynamodb.CfnTable;
    cfTable.addPropertyOverride(
      "KinesisStreamSpecification.StreamArn",
      kinesisStream.streamArn
    );
  }

  private validateFieldsAndIndexes(id: string, props: TableProps): void {
    const { fields, primaryIndex } = props;

    // Validate "fields"
    if (fields && Object.keys(fields).length === 0) {
      throw new Error(`No fields defined for the "${id}" Table`);
    }

    // Validate "primaryIndex"
    if (primaryIndex && !primaryIndex.partitionKey) {
      throw new Error(
        `Missing "partitionKey" in primary index for the "${id}" Table`
      );
    }

    // Validate "fields" and "primaryIndex" co-exists
    if (fields) {
      if (!primaryIndex) {
        throw new Error(`Missing "primaryIndex" in "${id}" Table`);
      }
    } else {
      if (primaryIndex) {
        throw new Error(
          `Cannot configure the "primaryIndex" without setting the "fields" in "${id}" Table`
        );
      }
    }
  }

  private checkDeprecatedConsumers(consumers: {
    [consumerName: string]: FunctionDefinition | TableConsumerProps;
  }): void {
    if (Array.isArray(consumers)) {
      throw new Error(
        `The "consumers" property no longer takes an array. It nows takes an associative array with the consumer name being the index key. More details on upgrading - https://docs.serverless-stack.com/constructs/Table#upgrading-to-v0210`
      );
    }
  }

  private checkDeprecatedSecondaryIndexes(): void {
    logger.debug(
      `WARNING: The "secondaryIndexes" property has been renamed to "globalIndexes". "secondaryIndexes" will continue to work but will be removed at a later date. More details on the deprecation - https://docs.serverless-stack.com/constructs/Table#secondaryindexes-deprecated`
    );
  }
}
