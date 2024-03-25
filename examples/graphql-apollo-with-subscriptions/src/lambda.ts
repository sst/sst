/**
 * Credits: Michal Kvasničák
 * URL: https://github.com/michalkvasnicak/aws-lambda-graphql
 */

import {
  DynamoDBConnectionManager,
  DynamoDBEventProcessor,
  DynamoDBEventStore,
  DynamoDBSubscriptionManager,
  PubSub,
  Server,
} from "aws-lambda-graphql";

const subscriptionManager = new DynamoDBSubscriptionManager({
  subscriptionsTableName: process.env.SUBSCRIPTIONS_TABLE,
  subscriptionOperationsTableName: process.env.SUBSCRIPTION_OPERATIONS_TABLE,
});
const connectionManager = new DynamoDBConnectionManager({
  subscriptions: subscriptionManager,
  connectionsTable: process.env.CONNECTIONS_TABLE,
});
const eventStore = new DynamoDBEventStore({
  eventsTable: process.env.EVENTS_TABLE,
});
const eventProcessor = new DynamoDBEventProcessor();
const pubSub = new PubSub({
  eventStore,
});

const typeDefs = /* GraphQL */ `
  type Mutation {
    broadcast(message: String!): String!
    publish(topic: String!, message: String!): String!
  }

  type Query {
    hello: String!
  }

  type Subscription {
    broadcast: String!
    subscribe(topic: String!): String!
  }
`;

const resolvers = {
  Mutation: {
    broadcast: async (root: any, { message }: any, ctx: any) => {
      await ctx.pubSub.publish("BROADCAST", { message });

      return message;
    },
    publish: async (root: any, { topic, message }: any, ctx: any) => {
      await ctx.pubSub.publish(topic, { topic, message });

      return message;
    },
  },
  Query: {
    hello: () => "Hello, World!",
  },
  Subscription: {
    broadcast: {
      resolve: (event: any) => event.message,
      subscribe: (event: any, args: any, ctx: any, info: any) => {
        return ctx.pubSub.subscribe("BROADCAST")(event, args, ctx, info);
      },
    },
    subscribe: {
      resolve: (event: any) => event.message,
      subscribe: (event: any, args: any, ctx: any, info: any) => {
        return ctx.pubSub.subscribe(args.topic)(event, args, ctx, info);
      },
    },
  },
};

const IS_LOCAL = !!process.env.IS_LOCAL;

const server = new Server({
  subscriptionManager,
  connectionManager,
  eventProcessor,
  resolvers,
  typeDefs,
  context: {
    pubSub,
  },
  playground: /* ISLOCAL && */ {
    endpoint: process.env.HTTP_API_ENDPOINT,
    subscriptionEndpoint: process.env.WEBSOCKET_API_ENDPOINT,
  },
  introspection: IS_LOCAL,
});

export const handleWebSocket = server.createWebSocketHandler();
export const handleHTTP = server.createHttpHandler();
export const handleEvents = server.createEventHandler();
