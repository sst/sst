import * as aws from "@pulumi/aws";

import { ComponentResourceOptions, all, output } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component.js";
import { Input } from "../input.js";
import { Link } from "../link.js";
import { hashStringToPrettyString, sanitizeToPascalCase } from "../naming.js";
import { FunctionArgs } from "./function.js";
import { KinesisStreamLambdaSubscriber } from "./kinesis-stream-lambda-subscriber.js";
import { parseKinesisStreamArn } from "./helpers/arn.js";
import { permission } from "./permission.js";

export interface KinesisStreamArgs {
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Kinesis stream resource.
     */
    stream?: Transform<aws.kinesis.StreamArgs>;
  };
}

export interface KinesisStreamLambdaSubscriberArgs {
  /**
   * Filter the events that'll be processed by the `subscribers` functions.
   *
   * :::tip
   * You can pass in up to 5 different filters.
   * :::
   *
   * You can pass in up to 5 different filter policies. These will logically ORed together. Meaning that if any single policy matches, the record will be processed. Learn more about the [filter rule syntax](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-syntax).
   *
   * @example
   * For example, if your Kinesis stream contains events in this JSON format.
   * ```js
   * {
   *   record: 12345,
   *   order: {
   *     type: "buy",
   *     stock: "ANYCO",
   *     quantity: 1000
   *   }
   * }
   * ```
   *
   * To process only those events where the `type` is `buy`.
   * ```js
   * {
   *   filters: [
   *     {
   *       data: {
   *         order: {
   *           type: ["buy"],
   *         },
   *       },
   *     },
   *   ],
   * }
   * ```
   *
   */
  filters?: Input<Input<Record<string, any>>[]>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
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
 * The `KinesisStream` component lets you add an [Amazon Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html) to your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
 * const stream = new sst.aws.KinesisStream("MyStream");
 * ```
 *
 * #### Subscribe to a stream
 *
 * ```ts title="sst.config.ts"
 * stream.subscribe("src/subscriber.handler");
 * ```
 *
 * #### Link the stream to a resource
 *
 * You can link the stream to other resources, like a function or your Next.js app.
 *
 * ```ts {2} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [stream]
 * });
 * ```
 *
 * Once linked, you can write to the stream from your function code.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";
 *
 * const client = new KinesisClient();
 *
 * await client.send(new PutRecordCommand({
 *   StreamName: Resource.MyStream.name,
 *   Data: JSON.stringify({ foo: "bar" }),
 *   PartitionKey: "myKey",
 * }));
 * ```
 */
export class KinesisStream extends Component implements Link.Linkable {
  private constructorName: string;
  private stream: aws.kinesis.Stream;

  constructor(
    name: string,
    args?: KinesisStreamArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;
    const stream = createStream();
    this.stream = stream;
    this.constructorName = name;

    function createStream() {
      return new aws.kinesis.Stream(
        `${name}Stream`,
        transform(args?.transform?.stream, {
          streamModeDetails: {
            streamMode: "ON_DEMAND",
          },
        }),
        { parent },
      );
    }
  }

  /**
   * Subscribe to the Kinesis stream.
   *
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * ```js title="sst.config.ts"
   * stream.subscribe("src/subscriber.handler");
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js title="sst.config.ts"
   * stream.subscribe("src/subscriber.handler", {
   *   filters: [
   *     {
   *       data: {
   *         order: {
   *           type: ["buy"],
   *         },
   *       },
   *     },
   *   ],
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js title="sst.config.ts"
   * stream.subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
   * });
   * ```
   */
  public subscribe(
    subscriber: string | FunctionArgs,
    args?: KinesisStreamLambdaSubscriberArgs,
  ) {
    return KinesisStream._subscribe(
      this.constructorName,
      this.nodes.stream.arn,
      subscriber,
      args,
    );
  }

  /**
   * Subscribe to the Kinesis stream that was not created in your app.
   *
   * @param streamArn The ARN of the Kinesis Stream to subscribe to.
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * For example, let's say you have the ARN of an existing Kinesis stream.
   *
   * ```js title="sst.config.ts"
   * const streamArn = "arn:aws:kinesis:us-east-1:123456789012:stream/MyStream";
   * ```
   *
   * You can subscribe to it by passing in the ARN.
   *
   * ```js title="sst.config.ts"
   * sst.aws.KinesisStream.subscribe(streamArn, "src/subscriber.handler");
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js title="sst.config.ts"
   * sst.aws.KinesisStream.subscribe(streamArn, "src/subscriber.handler", {
   *   filters: [
   *     {
   *       data: {
   *         order: {
   *           type: ["buy"],
   *         },
   *       },
   *     },
   *   ],
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js title="sst.config.ts"
   * sst.aws.KinesisStream.subscribe(streamArn, {
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
   * });
   * ```
   */
  public static subscribe(
    streamArn: Input<string>,
    subscriber: string | FunctionArgs,
    args?: KinesisStreamLambdaSubscriberArgs,
  ) {
    const streamName = output(streamArn).apply(
      (streamArn) => parseKinesisStreamArn(streamArn).streamName,
    );
    return this._subscribe(streamName, streamArn, subscriber, args);
  }

  private static _subscribe(
    name: Input<string>,
    streamArn: Input<string>,
    subscriber: string | FunctionArgs,
    args: KinesisStreamLambdaSubscriberArgs = {},
    opts?: ComponentResourceOptions,
  ) {
    return all([name, streamArn, args]).apply(([name, streamArn, args]) => {
      const prefix = sanitizeToPascalCase(name);
      const suffix = sanitizeToPascalCase(
        hashStringToPrettyString(
          [
            streamArn,
            JSON.stringify(args.filters ?? {}),
            typeof subscriber === "string" ? subscriber : subscriber.handler,
          ].join(""),
          6,
        ),
      );
      return new KinesisStreamLambdaSubscriber(
        `${prefix}Subscriber${suffix}`,
        {
          stream: { arn: streamArn },
          subscriber,
          ...args,
        },
        opts,
      );
    });
  }

  public get name() {
    return this.stream.name;
  }

  public get arn() {
    return this.stream.arn;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon Kinesis Data Stream.
       */
      stream: this.stream,
    };
  }

  /** @internal */
  getSSTLink() {
    return {
      properties: {
        name: this.stream.name,
      },
      include: [
        permission({
          actions: ["kinesis:*"],
          resources: [this.nodes.stream.arn],
        }),
      ],
    };
  }
}

const __pulumiType = "sst:aws:KinesisStream";
// @ts-expect-error
KinesisStream.__pulumiType = __pulumiType;
