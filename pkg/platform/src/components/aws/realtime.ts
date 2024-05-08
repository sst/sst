import { ComponentResourceOptions, Output, all, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import type { Input } from "../input";
import { Function, FunctionArgs } from "./function";
import { hashStringToPrettyString, sanitizeToPascalCase } from "../naming";
import { RealtimeLambdaSubscriber } from "./realtime-lambda-subscriber";

export interface RealtimeArgs {
  /**
   * The Lambda function that'll be used to authorize the client on connection.
   * @example
   * ```js
   * {
   *   authorizer: "src/authorizer.handler"
   * }
   * ```
   */
  authorizer: Input<string | FunctionArgs>;
  /**
   * [Transform](/docs/components#transform) how this subscription creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the IoT authorizer resource.
     */
    authorizer?: Transform<aws.iot.AuthorizerArgs>;
  };
}

export interface RealtimeSubscriberArgs {
  /**
   * Filter the topics that'll be processed by the subscriber.
   *
   * :::tip
   * Learn more about [topic filters](https://docs.aws.amazon.com/iot/latest/developerguide/topics.html#topicfilters).
   * :::
   *
   * @example
   * Subscribe to a specific topic.
   * ```js
   * {
   *   filter: `${$app.name}/${$app.stage}/chat/room1`
   * }
   * ```
   *
   * Subscribe to all topics under a prefix.
   * ```js
   * {
   *   filter: `${$app.name}/${$app.stage}/chat/#`
   * }
   * ```
   */
  filter: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this subscription creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the IoT topic rule resource.
     */
    topicRule?: Transform<aws.iot.TopicRuleArgs>;
  };
}

/**
 * The `Realtime` component lets you publish and subscribe to messages in realtime.
 *
 * - It offers a topic-based messaging network using [AWS IoT](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html).
 * - Lets you publish and subscribe to messages using WebSocket in the browser and from your server.
 * - Provides an [SDK](#sdk) to authorize clients, and grants permissions to subscribe and publish to topics.
 *
 * :::note
 * There is only 1 IoT endpoint per region per AWS account. Messages from all apps and
 * stages are published to the same IoT endpoint. Make sure to prefix the topics by the
 * app and stage name.
 * :::
 *
 * @example
 *
 * #### Use realtime endpoint in your app
 *
 * ```ts
 * const server = new sst.aws.Realtime("MyServer", {
 *   authorizer: "src/authorizer.handler"
 * });
 * ```
 *
 * Use the [`RealtimeAuthHandler`](#realtimeauthhandler) function in the SDK to authorize
 * the client, and grant permissions to subscribe and publish to topics.
 *
 * #### Publish and receive messages in your frontend
 *
 * ```ts
 * const client = new mqtt.MqttClient();
 * const connection = client.new_connection(config);
 *
 * // Subscribe messages
 * connection.on("message", (topic, payload) => {
 *   // handle the message
 * });
 *
 * // Publish messages
 * connection.publish(topic, payload, mqtt.QoS.AtLeastOnce);
 * ```
 *
 * #### Subscribe messages in your backend
 *
 * ```ts
 * server.subscribe("src/subscriber.handler", {
 *   filter: `${$app.name}/${$app.stage}/chat/room1`
 * });
 * ```
 *
 * #### Publish message from your backend
 *
 * ```ts
 * import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
 * const data = new IoTDataPlaneClient();
 * await data.send(
 *   new PublishCommand({
 *     payload: Buffer.from(
 *       JSON.stringify({ message: "Hello world" })
 *     ),
 *     topic: `${Resource.App.name}/${Resource.App.stage}/chat/room1`,
 *   })
 * );
 * ```
 */
export class Realtime extends Component {
  private readonly constructorName: string;
  private readonly authHadler: Output<Function>;
  private readonly iotAuthorizer: aws.iot.Authorizer;
  private readonly iotEndpoint: Output<string>;

  constructor(
    name: string,
    args: RealtimeArgs,
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const authHadler = createAuthorizerFunction();
    const iotAuthorizer = createAuthorizer();
    createPermission();

    this.iotEndpoint = aws.iot.getEndpointOutput({
      endpointType: "iot:Data-ATS",
    }).endpointAddress;
    this.constructorName = name;
    this.authHadler = authHadler;
    this.iotAuthorizer = iotAuthorizer;

    function createAuthorizerFunction() {
      return Function.fromDefinition(
        `${name}AuthorizerHandler`,
        args.authorizer,
        {
          description: `Authorizer for ${name}`,
          permissions: [
            {
              actions: ["iot:*"],
              resources: ["*"],
            },
          ],
        },
        undefined,
        { parent },
      );
    }

    function createAuthorizer() {
      return new aws.iot.Authorizer(
        `${name}Authorizer`,
        transform(args.transform?.authorizer, {
          signingDisabled: true,
          authorizerFunctionArn: authHadler.arn,
        }),
        { parent },
      );
    }

    function createPermission() {
      return new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: authHadler.arn,
          principal: "iot.amazonaws.com",
          sourceArn: iotAuthorizer.arn,
        },
        { parent },
      );
    }
  }

  /**
   * The IoT endpoint.
   */
  public get endpoint() {
    return this.iotEndpoint;
  }

  /**
   * The name of the IoT authorizer.
   */
  public get authorizer() {
    return this.iotAuthorizer.name;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The IoT authorizer resource.
       */
      authorizer: this.iotAuthorizer,
      /**
       * The IoT authorizer function resource.
       */
      authHandler: this.authHadler,
    };
  }

  /**
   * Subscribe to this Realtime server.
   *
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * ```js
   * server.subscribe("src/subscriber.handler", {
   *   filter: `${$app.name}/${$app.stage}/chat/room1`
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * server.subscribe(
   *   {
   *     handler: "src/subscriber.handler",
   *     timeout: "60 seconds"
   *   },
   *   {
   *     filter: `${$app.name}/${$app.stage}/chat/room1`
   *   }
   * );
   * ```
   */
  public subscribe(
    subscriber: string | FunctionArgs,
    args: RealtimeSubscriberArgs,
  ) {
    return all([subscriber, args.filter]).apply(([subscriber, filter]) => {
      const prefix = sanitizeToPascalCase(this.constructorName);
      const suffix = sanitizeToPascalCase(
        hashStringToPrettyString(
          [
            filter,
            typeof subscriber === "string" ? subscriber : subscriber.handler,
          ].join(""),
          6,
        ),
      );

      return new RealtimeLambdaSubscriber(`${prefix}Subscriber${suffix}`, {
        iot: { name: this.constructorName },
        subscriber,
        ...args,
      });
    });
  }
}

const __pulumiType = "sst:aws:Realtime";
// @ts-expect-error
Realtime.__pulumiType = __pulumiType;
