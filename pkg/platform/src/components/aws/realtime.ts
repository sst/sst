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
   * Filter the topics that'll be processed by the subscriber,
   *
   * :::tip
   * Learn more about [topic filters](https://docs.aws.amazon.com/iot/latest/developerguide/topics.html#topicfilters).
   * :::
   *
   * @example
   * For example, this subscribes to a specific topic.
   * ```js
   * {
   *   filter: "chat/room1"
   * }
   * ```
   *
   * And to subscribe to all topics under a specific prefix.
   * ```js
   * {
   *   filter: "chat/#"
   * }
   * ```
   */
  filter?: Input<string>;
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
 * The `Realtime` component lets you connect to the [Amazon IoT WebSocket endpoint](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html) in your app.
 *
 * @example
 *
 * #### Create a realtime endpoint
 *
 * ```ts
 * const server = new sst.aws.Realtime("MyServer", {
 *   authorizer: "src/authorizer.handler"
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts
 * server.subscribe("src/subscriber.handler");
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
   * server.subscribe("src/subscriber.handler");
   * ```
   *
   * Add a topic filter to the subscription.
   *
   * ```js
   * server.subscribe("src/subscriber.handler", {
   *   filter: "chat/room1"
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * server.subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
   * });
   * ```
   */
  public subscribe(
    subscriber: string | FunctionArgs,
    args: RealtimeSubscriberArgs = {},
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
