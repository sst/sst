import {
  ComponentResourceOptions,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionArgs } from "./function";
import { hashStringToPrettyString, sanitizeToPascalCase } from "../naming";

export interface DynamoArgs {
  /**
   * An object defining the fields of the table. Key is the name of the field and the value is the type.
   *
   * @example
   * ```js
   * {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *   }
   * }
   * ```
   */
  fields: Input<Record<string, "string" | "number" | "binary">>;
  /**
   * Define the table's primary index.
   *
   * @example
   * ```js
   * {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *   },
   *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" },
   * }
   * ```
   */
  primaryIndex: Input<{
    /**
     * Define the hash key for the primary index
     */
    hashKey: Input<string>;
    /**
     * Define the sort key for the primary index
     */
    rangeKey?: Input<string>;
  }>;
  /**
   * Configure the table's global secondary indexes
   *
   * @example
   *
   * ```js
   * {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *     createdAt: "number",
   *   },
   *   globalIndexes: {
   *     "CreatedAtIndex": { hashKey: "userId", rangeKey: "createdAt" },
   *   },
   * }
   * ```
   */
  globalIndexes?: Input<
    Record<
      string,
      Input<{
        /**
         * Define the hash key for the global secondary index
         */
        hashKey: Input<string>;
        /**
         * Define the sort key for the global secondary index
         */
        rangeKey?: Input<string>;
      }>
    >
  >;
  /**
   * Configure the table's local secondary indexes
   *
   * @example
   * ```js
   * {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *     createdAt: "number",
   *   },
   *   localIndexes: {
   *     "CreatedAtIndex": { rangeKey: "createdAt" },
   *   },
   * }
   * ```
   */
  localIndexes?: Input<
    Record<
      string,
      Input<{
        /**
         * Define the sort key for the local secondary index
         */
        rangeKey: Input<string>;
      }>
    >
  >;
  /**
   * When an item in the table is modified, the stream captures the information and sends it to your function.
   * You can configure the information that will be written to the stream whenever data in the table is modified:
   * - new-image: The entire item, as it appears after it was modified.
   * - old-image: The entire item, as it appeared before it was modified.
   * - new-and-old-images:	oth the new and the old images of the item.
   * - keys-only: Only the key fields of the modified item.
   * @default Stream not enabled
   * @example
   * ```js
   * {
   *   stream: "new-and-old-images",
   * }
   * ```
   */
  stream?: Input<
    "keys-only" | "new-image" | "old-image" | "new-and-old-images"
  >;
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the DynamoDB Table resource.
     */
    table?: Transform<aws.dynamodb.TableArgs>;
  };
}

export interface DynamoSubscribeArgs {
  /**
   * Filter the records processed by the `subscriber` function.
   *
   * :::tip
   * Learn more about the [filter rule syntax](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-syntax).
   * :::
   *
   * @example
   * For example, if your DynamoDB table's stream contains the follow record.
   * ```js
   * {
   *   eventID: "1",
   *   eventVersion: "1.0",
   *   dynamodb: {
   *     ApproximateCreationDateTime: "1678831218.0",
   *     Keys: {
   *       CustomerName: {
   *           "S": "AnyCompany Industries"
   *       },
   *       NewImage: {
   *         AccountManager: {
   *           S: "Pat Candella"
   *         },
   *         PaymentTerms: {
   *           S: "60 days"
   *         },
   *         CustomerName: {
   *           S: "AnyCompany Industries"
   *         }
   *       },
   *       SequenceNumber: "111",
   *       SizeBytes: 26,
   *       StreamViewType: "NEW_IMAGE"
   *     }
   *   }
   * }
   * ```
   *
   * To process only those records where the `RequestCode` is `BBBB`.

   * ```js
   * {
   *   filters: [
   *     {
   *       dynamodb: {
   *         Keys: {
   *           CustomerName: {
   *             S: ["AnyCompany Industries"]
   *           }
   *         }
   *       }
   *     }
   *   ]
   * }
   * ```
   */
  filters?: Input<Input<Record<string, any>>[]>;
  /**
   * [Transform](/docs/components#transform/) how this subscription creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Lambda Event Source Mapping resource.
     */
    eventSourceMapping?: Transform<aws.lambda.EventSourceMappingArgs>;
  };
}

/**
 * The `Dynamo` component lets you add an [AWS DynamoDB Table](https://aws.amazon.com/dynamodb/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * new sst.aws.Dynamo("MyTable", {
 *   fields: {
 *     userId: "string",
 *     noteId: "string",
 *   },
 *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" },
 * });
 * ```
 */
export class Dynamo
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private constructorName: string;
  private table: Output<aws.dynamodb.Table>;
  private isStreamEnabled: boolean = false;

  constructor(
    name: string,
    args: DynamoArgs,
    opts: ComponentResourceOptions = {},
  ) {
    super("sst:aws:Dynamo", name, args, opts);

    const parent = this;

    const table = createTable();

    this.constructorName = name;
    this.table = table;
    this.isStreamEnabled = Boolean(args.stream);

    function createTable() {
      return all([
        args.fields,
        args.primaryIndex,
        args.globalIndexes,
        args.localIndexes,
        args.stream,
      ]).apply(
        ([fields, primaryIndex, globalIndexes, localIndexes, stream]) =>
          new aws.dynamodb.Table(
            `${name}Table`,
            transform(args.transform?.table, {
              attributes: Object.entries(fields).map(([name, type]) => ({
                name,
                type: type === "string" ? "S" : type === "number" ? "N" : "B",
              })),
              billingMode: "PAY_PER_REQUEST",
              hashKey: primaryIndex.hashKey,
              rangeKey: primaryIndex.rangeKey,
              streamEnabled: Boolean(stream),
              streamViewType: stream
                ? stream.toUpperCase().replaceAll("-", "_")
                : undefined,
              pointInTimeRecovery: {
                enabled: true,
              },
              globalSecondaryIndexes: Object.entries(globalIndexes ?? {}).map(
                ([name, index]) => ({
                  name,
                  hashKey: index.hashKey,
                  rangeKey: index.rangeKey,
                  projectionType: "ALL",
                }),
              ),
              localSecondaryIndexes: Object.entries(localIndexes ?? {}).map(
                ([name, index]) => ({
                  name,
                  rangeKey: index.rangeKey,
                  projectionType: "ALL",
                }),
              ),
            }),
            { parent },
          ),
      );
    }
  }

  /**
   * The ARN of the DynamoDB Table.
   */
  public get arn() {
    return this.table.arn;
  }

  /**
   * The name of the DynamoDB Table.
   */
  public get name() {
    return this.table.name;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon DynamoDB Table.
       */
      table: this.table,
    };
  }

  /**
   * Subscribes to the DynamoDB Table.
   * @example
   *
   * ```js
   * subscribe("src/subscriber.handler");
   * ```
   *
   * Customize the subscription.
   * ```js
   * subscribe("src/subscriber.handler", {
   *   batchSize: 5,
   * });
   * ```
   *
   * Customize the subscriber function.
   * ```js
   * subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds",
   * });
   * ```
   */
  public subscribe(
    subscriber: string | FunctionArgs,
    args: DynamoSubscribeArgs = {},
  ) {
    const parent = this;
    const parentName = this.constructorName;

    // Validate stream is enabled
    if (!this.isStreamEnabled)
      throw new Error(
        `Cannot subscribe to "${parentName}" because stream is not enabled.`,
      );

    // Build subscriber name
    const id = sanitizeToPascalCase(
      hashStringToPrettyString(JSON.stringify(args.filters ?? {}), 4),
    );

    const fn = Function.fromDefinition(
      parent,
      `${parentName}Subscriber${id}`,
      subscriber,
      {
        description: `Subscribed to ${parentName}`,
        permissions: [
          {
            actions: [
              "dynamodb:DescribeStream",
              "dynamodb:GetRecords",
              "dynamodb:GetShardIterator",
              "dynamodb:ListStreams",
            ],
            resources: [this.nodes.table.streamArn],
          },
        ],
      },
    );
    new aws.lambda.EventSourceMapping(
      `${parentName}EventSourceMapping${id}`,
      transform(args?.transform?.eventSourceMapping, {
        eventSourceArn: this.nodes.table.streamArn,
        functionName: fn.name,
        filterCriteria: args?.filters && {
          filters: output(args.filters).apply((filters) =>
            filters.map((filter) => ({
              pattern: JSON.stringify(filter),
            })),
          ),
        },
        startingPosition: "LATEST",
      }),
      { parent },
    );
    return this;
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        name: this.name,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["dynamodb:*"],
        resources: [this.arn, interpolate`${this.arn}/*`],
      },
    ];
  }
}
