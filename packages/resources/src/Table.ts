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
  /**
   * An object defining the fields of the table. Key is the name of the field and the value is the type
   */
  fields?: Record<string, TableFieldType>;
  /**
   * Define the table's primary index
   *
   * @example
   * ### Specifying just the primary index
   *
   * ```js
   * import { Table } from "@serverless-stack/resources";
   *
   * new Table(this, "Notes", {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *   },
   *   primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
   * });
   * ```
   */
  primaryIndex?: {
    /**
     * Partition key for the primary index
     */
    partitionKey: string;
    /**
     * Sort key for the primary index
     */
    sortKey?: string;
  };
  /**
   * Configure the table's global secondary indexes
   *
   * @example
   *
   * ### Adding global indexes
   *
   * ```js
   * new Table(this, "Notes", {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *     time: "number",
   *   },
   *   primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
   *   globalIndexes: {
   *     userTimeIndex: { partitionKey: "userId", sortKey: "time" },
   *   },
   * });
   * ```
   */
  globalIndexes?: Record<string, TableGlobalIndexProps>;
  /**
   * Configure the table's local secondary indexes
   *
   * @example
   * ### Adding local indexes
   *
   * ```js
   * new Table(this, "Notes", {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *     time: "number",
   *   },
   *   primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
   *   localIndexes: {
   *     userTimeIndex: { sortKey: "time" },
   *   },
   * });
   * ```
   *
   */
  localIndexes?: Record<string, TableLocalIndexProps>;
  kinesisStream?: KinesisStream;
  /**
   * Configure the information that will be written to the Stream.
   *
   * @example
   * ### Configuring the Stream content
   *
   * ```js {8}
   * import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
   *
   * new Table(this, "Notes", {
   *   fields: {
   *     noteId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "noteId" },
   *   stream: StreamViewType.NEW_IMAGE,
   *   consumers: {
   *     consumer1: "src/consumer1.main",
   *     consumer2: "src/consumer2.main",
   *   },
   * });
   * ```
   */
  stream?: boolean | Lowercase<keyof typeof dynamodb.StreamViewType>;
  defaults?: {
    /**
     * Set some function props and have them apply to all the consumers.
     *
     * @example
     * ### Specifying function props for all the consumers
     *
     * ```js {3-7}
     * new Table(this, "Notes", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { topicName: topic.topicName },
     *       permissions: [topic],
     *     }
     *   },
     *   stream: true,
     *   consumers: {
     *     consumer1: "src/consumer1.main",
     *     consumer2: "src/consumer2.main",
     *   }
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * Configure DynamoDB streams and consumers
   *
   * @example
   * ### Enabling DynamoDB Streams
   *
   * #### Using the minimal config
   *
   * Enable DynamoDB Streams and add consumers.
   *
   * ```js {6-10}
   * const table = new Table(this, "Notes", {
   *   fields: {
   *     noteId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "noteId" },
   *   stream: true,
   *   consumers: {
   *     consumer1: "src/consumer1.main",
   *     consumer2: "src/consumer2.main",
   *   },
   * });
   * ```
   *
   * #### Using the full config
   *
   * If you wanted to configure each Lambda function separately, you can pass in the [`TableConsumerProps`](#tableconsumerprops).
   *
   * ```js
   * new Table(this, "Notes", {
   *   stream: true,
   *   consumers: {
   *     consumer1: {
   *       function: {
   *         handler: "src/consumer1.main",
   *         timeout: 10,
   *         environment: { topicName: topic.topicName },
   *         permissions: [topic],
   *       },
   *     }
   *   },
   * });
   * ```
   *
   * Note that, you can set the `defaultFunctionProps` while using the `function` per consumer. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
   *
   * ```js
   * new Table(this, "Notes", {
   *   defaultFunctionProps: {
   *     timeout: 20,
   *     environment: { topicName: topic.topicName },
   *     permissions: [topic],
   *   },
   *   stream: true,
   *   consumers: {
   *     consumer1: {
   *       function: {
   *         handler: "src/consumer1.main",
   *         timeout: 10,
   *         environment: { bucketName: bucket.bucketName },
   *         permissions: [bucket],
   *       },
   *     },
   *     consumer2: "src/consumer2.main",
   *   },
   * });
   * ```
   *
   * So in the above example, the `consumer1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `topicName` and the `bucketName` environment variables set; as well as permissions to both the `topic` and the `bucket`.
   *
   * #### Configuring a consumer
   *
   * Configure the internally created CDK Event Source.
   *
   * ```js {10-15}
   * import { StartingPosition } from "aws-cdk-lib/aws-lambda";
   *
   * new Table(this, "Notes", {
   *   fields: {
   *     noteId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "noteId" },
   *   stream: true,
   *   consumers: {
   *     consumer1: {
   *       function: "src/consumer1.main",
   *       consumerProps: {
   *         startingPosition: StartingPosition.TRIM_HORIZON,
   *       },
   *     },
   *   },
   * });
   * ```
   */
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
  /**
   * Used to create the consumer function for the table.
   */
  function: FunctionDefinition;
  cdk?: {
    eventSource?: lambdaEventSources.DynamoEventSourceProps;
  };
}

export interface TableGlobalIndexProps {
  /**
   * The field that's to be used as a partition key for the index.
   */
  partitionKey: string;
  /**
   * The field that's to be used as the sort key for the index.
   */
  sortKey?: string;
  cdk?: {
    index?: Omit<
      dynamodb.GlobalSecondaryIndexProps,
      "indexName" | "partitionKey" | "sortKey"
    >;
  };
}

export interface TableLocalIndexProps {
  /**
   * The field that's to be used as the sort key for the index.
   */
  sortKey: string;
  cdk?: {
    index?: Omit<dynamodb.LocalSecondaryIndexProps, "indexName" | "sortKey">;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:
 *
 * - Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
 * - Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
 * - Provides a nicer interface for defining indexes.
 */
export class Table extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `Table` instance.
     */
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

  /**
   * Takes an object of a list of global secondary indexes, where the `key` is the name of the global secondary index and the value is using the [`TableGlobalIndexProps`](#tableindexprops) type.
   */
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
      if ((cdk?.index as dynamodb.GlobalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.index as dynamodb.GlobalSecondaryIndexProps)?.partitionKey) {
        throw new Error(
          `Cannot configure the "indexProps.partitionKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.index as dynamodb.GlobalSecondaryIndexProps)?.sortKey) {
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
        ...cdk?.index,
      });
    }
  }

  /**
   * Takes an object of a list of local secondary indexes, where the `key` is the name of the local secondary index and the value is using the [`TableLocalIndexProps`](#tableindexprops) type.
   */
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
      if ((cdk?.index as dynamodb.LocalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.index as dynamodb.LocalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      (this.cdk.table as dynamodb.Table).addLocalSecondaryIndex({
        indexName,
        sortKey: this.buildAttribute(this.fields, sortKey),
        ...cdk?.index,
      });
    }
  }

  /**
   * The ARN of the internally created CDK `Table` instance.
   */
  public get tableArn(): string {
    return this.cdk.table.tableArn;
  }

  /**
   * The name of the internally created CDK `Table` instance.
   */
  public get tableName(): string {
    return this.cdk.table.tableName;
  }

  /**
   * An object with the consumer name being a string and the value is either a FunctionDefinition or the TableConsumerProps.
   * @example
   * ### Lazily adding consumers
   *
   * ```js {9-12}
   * const table = new Table(this, "Notes", {
   *   fields: {
   *     noteId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "noteId" },
   *   stream: true,
   * });
   *
   * table.addConsumers(this, {
   *   consumer1: "src/consumer1.main",
   *   consumer2: "src/consumer2.main",
   * });
   * ```
   */
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

  /**
   * Grant permissions to all consumers of this table.
   *
   * @example
   * ### Giving the consumers permissions
   *
   * Allow the consumer functions to access S3.
   *
   * ```js {13}
   * const table = new Table(this, "Notes", {
   *   fields: {
   *     noteId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "noteId" },
   *   stream: true,
   *   consumers: {
   *     consumer1: "src/consumer1.main",
   *     consumer2: "src/consumer2.main",
   *   },
   * });
   *
   * table.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllConsumers.push(permissions);
  }
  /**
   * Grant permissions to a specific consumer of this table.
   *
   * @example
   * ### Giving a specific consumer permissions
   *
   * Allow the first consumer function to access S3.
   *
   * ```js {13}
   * const table = new Table(this, "Notes", {
   *   fields: {
   *     noteId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "noteId" },
   *   stream: true,
   *   consumers: {
   *     consumer1: "src/consumer1.main",
   *     consumer2: "src/consumer2.main",
   *   },
   * });
   *
   * table.attachPermissionsToConsumer("consumer1", ["s3"]);
   * ```
   */
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
  /**
   * Get the instance of the internally created [`Function`](Function.md), for a given consumer. Where the `consumerName` is the name used to define a consumer.
   */
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
      eventSourceProps = consumer.cdk?.eventSource;
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
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaults.function" to them.`
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
