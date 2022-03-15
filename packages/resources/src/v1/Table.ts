import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { KinesisStream } from "./KinesisStream";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

type TableFieldType = Lowercase<keyof typeof dynamodb.AttributeType>;

export interface TableProps {
  fields?: Record<string, TableFieldType>;
  primaryIndex?: {
    partitionKey: string;
    sortKey?: string;
  };
  globalIndexes?: Record<string, TableGlobalIndexProps>;
  localIndexes?: Record<string, TableLocalIndexProps>;
  kinesisStream?: KinesisStream;
  stream?: boolean | Lowercase<keyof typeof dynamodb.StreamViewType>;
  defaults?: {
    functionProps?: FunctionProps;
  };
  consumers?: {
    [consumerName: string]: FunctionInlineDefinition | TableConsumerProps;
  };
  cdk?: {
    table?:
      | dynamodb.ITable
      | Omit<dynamodb.TableProps, "partitionKey" | "sortKey">;
  };
}

export interface TableConsumerProps {
  function: FunctionDefinition;
  cdk?: {
    eventSourceProps?: lambdaEventSources.DynamoEventSourceProps;
  };
}

export type TableGlobalIndexProps = {
  partitionKey: string;
  sortKey?: string;
  cdk?: {
    indexProps?: Omit<
      dynamodb.GlobalSecondaryIndexProps,
      "indexName" | "partitionKey" | "sortKey"
    >;
  };
};

export type TableLocalIndexProps = {
  sortKey: string;
  cdk?: {
    indexProps?: Omit<
      dynamodb.LocalSecondaryIndexProps,
      "indexName" | "sortKey"
    >;
  };
};

/////////////////////
// Construct
/////////////////////

export class Table extends Construct implements SSTConstruct {
  public readonly cdk: {
    table: dynamodb.ITable;
  };
  private dynamodbTableType?: "CREATED" | "IMPORTED";
  private functions: { [consumerName: string]: Fn };
  private permissionsAttachedForAllConsumers: Permissions[];
  private props: TableProps;
  private stream?: dynamodb.StreamViewType;
  private fields?: Record<string, TableFieldType>;

  constructor(scope: Construct, id: string, props: TableProps) {
    super(scope, id);

    this.props = props;
    const { fields, globalIndexes, localIndexes, kinesisStream } = this.props;
    this.cdk = {} as any;
    this.functions = {};
    this.fields = fields;
    this.permissionsAttachedForAllConsumers = [];

    // Input Validation
    this.validateFieldsAndIndexes(id, props);

    // Create Table
    this.createTable();

    // Create Secondary Indexes
    if (globalIndexes) this.addGlobalIndexes(globalIndexes);
    if (localIndexes) this.addLocalIndexes(localIndexes);

    // Create Consumers
    if (props.consumers) {
      for (const consumerName in props.consumers) {
        this.addConsumer(this, consumerName, props.consumers[consumerName]);
      }
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
    for (const [indexName, { partitionKey, sortKey, cdk }] of Object.entries(
      secondaryIndexes
    )) {
      // Validate indexProps does not contain "indexName", "partitionKey" and "sortKey"
      if ((cdk?.indexProps as dynamodb.GlobalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if (
        (cdk?.indexProps as dynamodb.GlobalSecondaryIndexProps)?.partitionKey
      ) {
        throw new Error(
          `Cannot configure the "indexProps.partitionKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.indexProps as dynamodb.GlobalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      (this.cdk.table as dynamodb.Table).addGlobalSecondaryIndex({
        indexName,
        partitionKey: this.buildAttribute(this.fields, partitionKey),
        sortKey: sortKey
          ? this.buildAttribute(this.fields, sortKey)
          : undefined,
        ...cdk?.indexProps,
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
    for (const [indexName, { sortKey, cdk }] of Object.entries(
      secondaryIndexes!
    )) {
      // Validate indexProps does not contain "indexName", "partitionKey" and "sortKey"
      if ((cdk?.indexProps as dynamodb.LocalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.indexProps as dynamodb.LocalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      (this.cdk.table as dynamodb.Table).addLocalSecondaryIndex({
        indexName,
        sortKey: this.buildAttribute(this.fields, sortKey),
        ...cdk?.indexProps,
      });
    }
  }

  public get tableArn(): string {
    return this.cdk.table.tableArn;
  }

  public get tableName(): string {
    return this.cdk.table.tableName;
  }

  public addConsumers(
    scope: Construct,
    consumers: {
      [consumerName: string]: FunctionInlineDefinition | TableConsumerProps;
    }
  ): void {
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
        tableName: this.cdk.table.tableName,
        consumers: Object.entries(this.functions).map(([name, fun]) => ({
          name,
          fn: getFunctionRef(fun),
        })),
      },
    };
  }

  private createTable() {
    const { fields, primaryIndex, stream, cdk } = this.props;
    const app = this.node.root as App;
    const id = this.node.id;

    if (isCDKConstruct(cdk?.table)) {
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
      this.cdk.table = cdk?.table as dynamodb.Table;
    } else {
      let dynamodbTableProps = (cdk?.table || {}) as dynamodb.TableProps;

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
      this.cdk.table = new dynamodb.Table(this, "Table", {
        tableName: app.logicalPrefixedName(id),
        pointInTimeRecovery: true,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        stream: this.buildStreamConfig(stream),
        ...(dynamodbTableProps as dynamodb.TableProps),
      });
    }
  }

  private addConsumer(
    scope: Construct,
    consumerName: string,
    consumer: FunctionInlineDefinition | TableConsumerProps
  ): Fn {
    // validate stream enabled
    // note: if table is imported, do not check because we want to allow ppl to
    //       import without specifying the "tableStreamArn". And let them add
    //       consumers to it.
    if (!this.cdk.table.tableStreamArn) {
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
    let consumerFunction, eventSourceProps;
    if ((consumer as TableConsumerProps).function) {
      consumer = consumer as TableConsumerProps;
      consumerFunction = consumer.function;
      eventSourceProps = consumer.cdk?.eventSourceProps;
    } else {
      consumerFunction = consumer as FunctionInlineDefinition;
    }
    eventSourceProps = {
      startingPosition: lambda.StartingPosition.LATEST,
      ...(eventSourceProps || {}),
    };

    // create function
    const fn = Fn.fromDefinition(
      scope,
      consumerName,
      consumerFunction,
      this.props.defaults?.functionProps,
      `The "defaults.functionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaults.functionProps" to them.`
    );
    this.functions[consumerName] = fn;

    // create event source
    const eventSource = new lambdaEventSources.DynamoEventSource(
      this.cdk.table,
      eventSourceProps
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
      type: dynamodb.AttributeType[
        fields[name].toUpperCase() as keyof typeof dynamodb.AttributeType
      ],
    };
  }

  private buildStreamConfig(
    stream?: boolean | Lowercase<keyof typeof dynamodb.StreamViewType>
  ): dynamodb.StreamViewType | undefined {
    if (stream === true) {
      return dynamodb.StreamViewType.NEW_AND_OLD_IMAGES;
    } else if (stream === false || stream === undefined) {
      return undefined;
    }

    return dynamodb.StreamViewType[
      stream!.toUpperCase() as keyof typeof dynamodb.StreamViewType
    ];
  }

  private buildKinesisStreamSpec(kinesisStream?: KinesisStream): void {
    if (!kinesisStream) {
      return;
    }

    const cfTable = this.cdk.table.node.defaultChild as dynamodb.CfnTable;
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
}
