import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { App } from "./App";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export enum TableFieldType {
  BINARY = dynamodb.AttributeType.BINARY,
  NUMBER = dynamodb.AttributeType.NUMBER,
  STRING = dynamodb.AttributeType.STRING,
}

/////////////////////
// Interfaces
/////////////////////

export interface TableProps {
  readonly fields?: { [key: string]: TableFieldType };
  readonly primaryIndex?: TableIndexProps;
  readonly secondaryIndexes?: { [key: string]: TableIndexProps };
  readonly dynamodbTable?: dynamodb.ITable | TableCdkProps;
  readonly stream?: boolean | dynamodb.StreamViewType;
  readonly consumers?: (FunctionDefinition | TableConsumerProps)[];
}

export interface TableConsumerProps {
  readonly function: FunctionDefinition;
  readonly consumerProps?: lambdaEventSources.DynamoEventSourceProps;
}

export interface TableIndexProps {
  readonly partitionKey: string;
  readonly sortKey?: string;
  readonly indexProps?: TableCdkIndexProps;
}

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

export class Table extends cdk.Construct {
  public readonly dynamodbTable: dynamodb.Table;
  public readonly consumerFunctions: Fn[];
  private readonly permissionsAttachedForAllConsumers: Permissions[];
  private readonly stream?: dynamodb.StreamViewType;

  constructor(scope: cdk.Construct, id: string, props: TableProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      fields,
      primaryIndex,
      secondaryIndexes,
      dynamodbTable,
      stream,
      consumers,
    } = props;
    this.consumerFunctions = [];
    this.permissionsAttachedForAllConsumers = [];

    ////////////////////
    // Create Table
    ////////////////////

    this.validateFieldsAndIndexes(id, props);

    if (cdk.Construct.isConstruct(dynamodbTable)) {
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

    if (fields && secondaryIndexes) {
      Object.keys(secondaryIndexes).forEach((indexName) => {
        const { partitionKey, sortKey, indexProps = {} } = secondaryIndexes[
          indexName
        ];

        // Validate indexProps does not contain "indexName", "partitionKey" and "sortKey"
        if ((indexProps as dynamodb.GlobalSecondaryIndexProps).indexName) {
          throw new Error(
            `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${id}" Table`
          );
        }
        if ((indexProps as dynamodb.GlobalSecondaryIndexProps).partitionKey) {
          throw new Error(
            `Cannot configure the "indexProps.partitionKey" in the "${indexName}" index of the "${id}" Table`
          );
        }
        if ((indexProps as dynamodb.GlobalSecondaryIndexProps).sortKey) {
          throw new Error(
            `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${id}" Table`
          );
        }

        this.dynamodbTable.addGlobalSecondaryIndex({
          indexName,
          partitionKey: this.buildAttribute(fields, partitionKey),
          sortKey: sortKey ? this.buildAttribute(fields, sortKey) : undefined,
          ...indexProps,
        });
      });
    }

    ///////////////////////////
    // Create Consumers
    ///////////////////////////

    this.addConsumers(this, consumers || []);
  }

  addConsumers(
    scope: cdk.Construct,
    consumers: (FunctionDefinition | TableConsumerProps)[]
  ): void {
    consumers.forEach((consumer) => this.addConsumer(scope, consumer));
  }

  addConsumer(
    scope: cdk.Construct,
    consumer: FunctionDefinition | TableConsumerProps
  ): Fn {
    let fn: Fn;
    const i = this.consumerFunctions.length;

    // validate stream enabled
    if (!this.dynamodbTable.tableStreamArn) {
      throw new Error(
        `Please enable the "stream" option to add consumers to the "${this.node.id}" Table.`
      );
    }

    // consumer is props
    if ((consumer as TableConsumerProps).function) {
      consumer = consumer as TableConsumerProps;
      const consumerProps = consumer.consumerProps || {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      };
      fn = Fn.fromDefinition(scope, `Consumer_${i}`, consumer.function);
      fn.addEventSource(
        new lambdaEventSources.DynamoEventSource(
          this.dynamodbTable,
          consumerProps
        )
      );
    }
    // consumer is function
    else {
      consumer = consumer as FunctionDefinition;
      fn = Fn.fromDefinition(scope, `Consumer_${i}`, consumer);
      fn.addEventSource(
        new lambdaEventSources.DynamoEventSource(this.dynamodbTable, {
          startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        })
      );
    }
    this.consumerFunctions.push(fn);

    // attach permissions
    this.permissionsAttachedForAllConsumers.forEach((permissions) => {
      fn.attachPermissions(permissions);
    });

    return fn;
  }

  attachPermissions(permissions: Permissions): void {
    this.consumerFunctions.forEach((consumer) =>
      consumer.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllConsumers.push(permissions);
  }

  attachPermissionsToConsumer(index: number, permissions: Permissions): void {
    this.consumerFunctions[index].attachPermissions(permissions);
  }

  validateFieldsAndIndexes(id: string, props: TableProps): void {
    const { fields, primaryIndex, secondaryIndexes } = props;

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
      if (secondaryIndexes) {
        throw new Error(
          `Cannot configure the "secondaryIndexes" without setting the "fields" in "${id}" Table`
        );
      }
    }
  }

  buildAttribute(
    fields: { [key: string]: TableFieldType },
    name: string
  ): dynamodb.Attribute {
    return {
      name,
      type: this.convertTableFieldTypeToAttributeType(fields[name]),
    };
  }

  buildStreamConfig(
    stream?: boolean | dynamodb.StreamViewType
  ): dynamodb.StreamViewType | undefined {
    if (stream === true) {
      return dynamodb.StreamViewType.NEW_AND_OLD_IMAGES;
    } else if (stream === false) {
      return undefined;
    }

    return stream;
  }

  convertTableFieldTypeToAttributeType(
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
}
