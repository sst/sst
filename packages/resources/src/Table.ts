import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { App } from "./App.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { KinesisStream } from "./KinesisStream.js";
import { Permissions } from "./util/permission.js";

/////////////////////
// Interfaces
/////////////////////

export interface TableConsumerProps {
  /**
   * Used to create the consumer function for the table.
   */
  function: FunctionDefinition;
  cdk?: {
    /**
     * Override the settings of the internally created event source
     */
    eventSource?: lambdaEventSources.DynamoEventSourceProps;
  };
}

export interface TableLocalIndexProps {
  /**
   * The field that's to be used as the sort key for the index.
   */
  sortKey: string;
  /**
   * The set of attributes that are projected into the secondary index.
   * @default "all"
   */
  projection?:
    | Lowercase<keyof Pick<typeof dynamodb.ProjectionType, "ALL" | "KEYS_ONLY">>
    | string[];
  cdk?: {
    /**
     * Override the settings of the internally created local secondary indexes
     */
    index?: Omit<dynamodb.LocalSecondaryIndexProps, "indexName" | "sortKey">;
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
  /**
   * The set of attributes that are projected into the secondary index.
   * @default "all"
   */
  projection?:
    | Lowercase<keyof Pick<typeof dynamodb.ProjectionType, "ALL" | "KEYS_ONLY">>
    | string[];
  cdk?: {
    /**
     * Override the settings of the internally created global secondary index
     */
    index?: Omit<
      dynamodb.GlobalSecondaryIndexProps,
      "indexName" | "partitionKey" | "sortKey"
    >;
  };
}

type TableFieldType = Lowercase<keyof typeof dynamodb.AttributeType>;

export interface TableProps {
  /**
   * An object defining the fields of the table. Key is the name of the field and the value is the type.
   *
   * @example
   * ```js
   * new Table(stack, "Table", {
   *   fields: {
   *     pk: "string",
   *     sk: "string",
   *   }
   * })
   * ```
   */
  fields?: Record<string, TableFieldType>;
  primaryIndex?: {
    /**
     * Define the Partition Key for the table's primary index
     *
     * @example
     *
     * ```js
     * new Table(stack, "Table", {
     *   fields: {
     *     pk: "string",
     *   },
     *   primaryIndex: { partitionKey: "pk" },
     * });
     * ```
     */
    partitionKey: string;
    /**
     * Define the Sort Key for the table's primary index
     *
     * @example
     *
     * ```js
     * new Table(stack, "Table", {
     *   fields: {
     *     pk: "string",
     *     sk: "string",
     *   },
     *   primaryIndex: { partitionKey: "pk", sortKey: "sk" },
     * });
     * ```
     */
    sortKey?: string;
  };
  /**
   * Configure the table's global secondary indexes
   *
   * @example
   *
   * ```js
   * new Table(stack, "Table", {
   *   fields: {
   *     pk: "string",
   *     sk: "string",
   *     gsi1pk: "string",
   *     gsi1sk: "string",
   *   },
   *   globalIndexes: {
   *     "GSI1": { partitionKey: "gsi1pk", sortKey: "gsi1sk" },
   *   },
   * });
   * ```
   */
  globalIndexes?: Record<string, TableGlobalIndexProps>;
  /**
   * Configure the table's local secondary indexes
   *
   * @example
   *
   * ```js
   * new Table(stack, "Table", {
   *   fields: {
   *     pk: "string",
   *     sk: "string",
   *     lsi1sk: "string",
   *   },
   *   globalIndexes: {
   *     "lsi1": { sortKey: "lsi1sk" },
   *   },
   * });
   * ```
   */
  localIndexes?: Record<string, TableLocalIndexProps>;
  /**
   * The field that's used to store the expiration time for items in the table.
   *
   * @example
   * ```js {8}
   * new Table(stack, "Table", {
   *   timeToLiveAttribute: "expireAt",
   * });
   * ```
   */
  timeToLiveAttribute?: string;
  /**
   * Configure the KinesisStream to capture item-level changes for the table.
   *
   * @example
   *
   * ```js
   * const stream = new KinesisStream(stack, "Stream");
   *
   * new Table(stack, "Table", {
   *   kinesisStream: stream,
   * });
   * ```
   */
  kinesisStream?: KinesisStream;
  /**
   * Configure the information that will be written to the Stream.
   *
   * @example
   * ```js {8}
   * new Table(stack, "Table", {
   *   stream: "new_image",
   * });
   * ```
   */
  stream?: boolean | Lowercase<keyof typeof dynamodb.StreamViewType>;
  defaults?: {
    /**
     * The default function props to be applied to all the consumers in the Table. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     *
     * ```js
     * new Table(stack, "Table", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { topicName: topic.topicName },
     *       permissions: [topic],
     *     }
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * Configure DynamoDB streams and consumers
   *
   * @example
   *
   * ```js
   * const table = new Table(stack, "Table", {
   *   consumers: {
   *     consumer1: "src/consumer1.main",
   *     consumer2: "src/consumer2.main",
   *   },
   * });
   * ```
   */
  consumers?: Record<string, FunctionInlineDefinition | TableConsumerProps>;
  cdk?: {
    /**
     * Override the settings of the internally created cdk table
     */
    table?:
      | dynamodb.ITable
      | Omit<dynamodb.TableProps, "partitionKey" | "sortKey">;
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
   * The ARN of the internally created DynamoDB Table.
   */
  public get tableArn(): string {
    return this.cdk.table.tableArn;
  }

  /**
   * The name of the internally created DynamoDB Table.
   */
  public get tableName(): string {
    return this.cdk.table.tableName;
  }

  /**
   * Add additional global secondary indexes where the `key` is the name of the global secondary index
   *
   * @example
   * ```js
   * table.addGlobalIndexes({
   *   gsi1: {
   *     partitionKey: "pk",
   *     sortKey: "sk",
   *   }
   * })
   * ```
   */
  public addGlobalIndexes(
    secondaryIndexes: NonNullable<TableProps["globalIndexes"]>
  ) {
    if (!this.fields)
      throw new Error(
        `Cannot add secondary indexes to "${this.node.id}" Table without defining "fields"`
      );
    for (const [
      indexName,
      { partitionKey, sortKey, projection, cdk },
    ] of Object.entries(secondaryIndexes)) {
      // Validate index does not contain "indexName", "partitionKey" and "sortKey"
      if ((cdk?.index as dynamodb.GlobalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "cdk.index.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.index as dynamodb.GlobalSecondaryIndexProps)?.partitionKey) {
        throw new Error(
          `Cannot configure the "cdk.index.partitionKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.index as dynamodb.GlobalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "cdk.index.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      (this.cdk.table as dynamodb.Table).addGlobalSecondaryIndex({
        indexName,
        partitionKey: this.buildAttribute(this.fields, partitionKey),
        sortKey: sortKey
          ? this.buildAttribute(this.fields, sortKey)
          : undefined,
        ...(() => {
          if (!projection) {
            return undefined;
          } else if (Array.isArray(projection)) {
            return {
              projectionType: dynamodb.ProjectionType.INCLUDE,
              nonKeyAttributes: projection,
            };
          }
          return {
            projectionType:
              dynamodb.ProjectionType[
                projection.toUpperCase() as keyof typeof dynamodb.ProjectionType
              ],
          };
        })(),
        ...cdk?.index,
      });
    }
  }

  /**
   * Add additional local secondary indexes where the `key` is the name of the local secondary index
   *
   * @example
   * ```js
   * table.addLocalIndexes({
   *   lsi1: {
   *     sortKey: "sk",
   *   }
   * })
   * ```
   */
  public addLocalIndexes(
    secondaryIndexes: NonNullable<TableProps["localIndexes"]>
  ) {
    if (!this.fields)
      throw new Error(
        `Cannot add local secondary indexes to "${this.node.id}" Table without defining "fields"`
      );
    for (const [indexName, { sortKey, projection, cdk }] of Object.entries(
      secondaryIndexes!
    )) {
      // Validate index does not contain "indexName", "partitionKey" and "sortKey"
      if ((cdk?.index as dynamodb.LocalSecondaryIndexProps)?.indexName) {
        throw new Error(
          `Cannot configure the "cdk.index.indexName" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }
      if ((cdk?.index as dynamodb.LocalSecondaryIndexProps)?.sortKey) {
        throw new Error(
          `Cannot configure the "cdk.index.sortKey" in the "${indexName}" index of the "${this.node.id}" Table`
        );
      }

      (this.cdk.table as dynamodb.Table).addLocalSecondaryIndex({
        indexName,
        sortKey: this.buildAttribute(this.fields, sortKey),
        ...(() => {
          if (!projection) {
            return undefined;
          } else if (Array.isArray(projection)) {
            return {
              projectionType: dynamodb.ProjectionType.INCLUDE,
              nonKeyAttributes: projection,
            };
          }
          return {
            projectionType:
              dynamodb.ProjectionType[
                projection.toUpperCase() as keyof typeof dynamodb.ProjectionType
              ],
          };
        })(),
        ...cdk?.index,
      });
    }
  }

  /**
   * Define additional consumers for table events
   *
   * @example
   * ```js
   * table.addConsumers(stack, {
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
   * ```js
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
   * ```js
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
   * Get the instance of the internally created Function, for a given consumer.
   *
   * ```js
   *  const table = new Table(stack, "Table", {
   *    consumers: {
   *      consumer1: "./src/function.handler",
   *    }
   *  })
   * table.getFunction("consumer1");
   * ```
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
    const { fields, primaryIndex, stream, timeToLiveAttribute, cdk } = this.props;
    const app = this.node.root as App;
    const id = this.node.id;

    if (isCDKConstruct(cdk?.table)) {
      // Validate "fields" is not configured
      if (fields !== undefined) {
        throw new Error(
          `Cannot configure the "fields" when "cdk.table" is a construct in the "${id}" Table`
        );
      }

      // Validate "stream" is not configured
      if (stream !== undefined) {
        throw new Error(
          `Cannot configure the "stream" when "cdk.table" is a construct in the "${id}" Table`
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
          `Cannot configure the "cdk.table.partitionKey" in the "${id}" Table`
        );
      }
      if (dynamodbTableProps.sortKey) {
        throw new Error(
          `Cannot configure the "cdk.table.sortKey" in the "${id}" Table`
        );
      }
      if (dynamodbTableProps.stream) {
        throw new Error(
          `Cannot configure the "cdk.table.stream" in the "${id}" Table`
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
        timeToLiveAttribute,
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
      `Consumer_${this.node.id}_${consumerName}`,
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
    // Ensure the key is specified in "fields"
    if (!fields[name]) {
      throw new Error(
        `Please define "${name}" in "fields" to create the index in the "${this.node.id}" Table.`
      );
    }

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
