import { gql, ApolloServer } from "apollo-server-lambda";

const IS_LOCAL = !!process.env.IS_LOCAL;

const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello, New World!",
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: IS_LOCAL,
  introspection: IS_LOCAL,
});

export const handler = server.createHandler();
