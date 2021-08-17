<img alt="Logo" align="right" src="https://raw.githubusercontent.com/serverless-stack/identity/main/sst.svg" width="20%" />

# [SST Examples](https://serverless-stack.com/examples/index.html)

A collection of example serverless apps built with SST.

## Examples

| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Example&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
|---|---|
| [rest-api-js](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api)                                                             | Create a serverless REST API on AWS using the [`Api`](https://docs.serverless-stack.com/constructs/Api) construct to define the routes of our API. |
| [rest-api-ts](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api-ts)                                                          | Create a serverless REST API on AWS with TypeScript using the [`Api`](https://docs.serverless-stack.com/constructs/Api) construct to define the routes of our API. |
| [rest-api-go](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api-go)                                                          | Create a serverless REST API on AWS with Golang using the [`Api`](https://docs.serverless-stack.com/constructs/Api) construct to define the routes of our API. |
| [rest-api-with-domain](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api-custom-domain)                                      | Add a custom domain to a serverless REST API on AWS using the [`Api`](https://docs.serverless-stack.com/constructs/Api) construct. |
| [rest-api-crud-with-dynamodb](https://github.com/serverless-stack/serverless-stack/tree/master/examples/crud-api-dynamodb)                                    | Create a CRUD API with serverless using DynamoDB. With the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Table`](https://docs.serverless-stack.com/constructs/Table) constructs. |
| [rest-api-with-dynamodb](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api-dynamodb)                                         | Use DynamoDB in your serverless app on AWS using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Table`](https://docs.serverless-stack.com/constructs/Table) to create a simple hit counter. |
| [rest-api-with-mongo-db](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api-mongodb)                                          | Use MongoDB in your serverless app and create a simple API with [`Api`](https://docs.serverless-stack.com/constructs/Api) to query a list of movies. |
| [rest-api-with-postgresql-db](https://github.com/serverless-stack/serverless-stack/tree/master/examples/rest-api-postgresql)                                  | Use PostgreSQL in your serverless app on AWS using [`Api`](https://docs.serverless-stack.com/constructs/Api) and Amazon Aurora Serverless to create a simple hit counter. |
| [rest-api-iam-auth-cognito](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-cognito)                                       | Add Cognito User Pool authentication to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Auth`](https://docs.serverless-stack.com/constructs/Auth) constructs. |
| [rest-api-iam-auth-facebook](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-facebook)                                     | Add Facebook authentication to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Auth`](https://docs.serverless-stack.com/constructs/Auth) constructs. |
| [rest-api-iam-auth-google](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-google)                                         | Add Google authentication to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Auth`](https://docs.serverless-stack.com/constructs/Auth) constructs. |
| [rest-api-iam-auth-twitter](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-twitter)                                       | Add Twitter authentication to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Auth`](https://docs.serverless-stack.com/constructs/Auth) constructs. |
| [rest-api-iam-auth-auth0](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-auth0)                                           | Add Auth0 authentication to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Auth`](https://docs.serverless-stack.com/constructs/Auth) constructs. |
| [rest-api-jwt-auth-cognito](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-jwt-cognito-user-pool)                         | Add JWT authorization with Cognito User Pool to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) constructs. |
| [rest-api-jwt-auth-auth0](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-jwt-auth0)                                       | Add JWT authorization with Auth0 to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) constructs. |
| [rest-api-lambda-auth-simple-response](https://github.com/serverless-stack/serverless-stack/tree/master/examples/api-auth-lambda-authorizer-simple-response)  | Add Lambda authorizer to a serverless API using the [`Api`](https://docs.serverless-stack.com/constructs/Api) constructs. |
| [graphql-api-with-apollo](https://github.com/serverless-stack/serverless-stack/tree/master/examples/graphql-apollo)                                           | Create a serverless Apollo GraphQL API on AWS using the [`ApolloApi`](https://docs.serverless-stack.com/constructs/ApolloApi) construct. |
| [graphql-api-with-appsync](https://github.com/serverless-stack/serverless-stack/tree/master/examples/graphql-appsync)                                         | Create a serverless AppSync GraphQL API on AWS using the [`AppSyncApi`](https://docs.serverless-stack.com/constructs/AppSyncApi) construct. |
| [websocket-api](https://github.com/serverless-stack/serverless-stack/tree/master/examples/websocket)                                                          | Create a serverless WebSocket API on AWS using the [`WebSocketApi`](https://docs.serverless-stack.com/constructs/WebSocketApi) construct to define the routes of our API. |
| [react.js-with-api](https://github.com/serverless-stack/serverless-stack/tree/master/examples/react-app)                                                      | Create a full-stack serverless React.js click counter app on AWS using the [`ReactStaticSite`](https://docs.serverless-stack.com/constructs/ReactStaticSite) construct. |
| [react.js-with-auth-api](https://github.com/serverless-stack/serverless-stack/tree/master/examples/react-app-auth-cognito)                                    | Create a full-stack serverless React.js app that connects to an API secured using Cognito. Uses the [`ReactStaticSite`](https://docs.serverless-stack.com/constructs/ReactStaticSite) and [`Auth`](https://docs.serverless-stack.com/constructs/Auth) construct. |
| [cron-job](https://github.com/serverless-stack/serverless-stack/tree/master/examples/cron-job)                                                                | Create a cron job in your serverless app using the [`Cron`](https://docs.serverless-stack.com/constructs/Cron) construct. |
| [queue](https://github.com/serverless-stack/serverless-stack/tree/master/examples/queue)                                                                      | Create a queue system in your serverless app using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Queue`](https://docs.serverless-stack.com/constructs/Queue) constructs. |
| [topic](https://github.com/serverless-stack/serverless-stack/tree/master/examples/pub-sub)                                                                    | Create a pub/sub system in your serverless app using the [`Api`](https://docs.serverless-stack.com/constructs/Api) and [`Topic`](https://docs.serverless-stack.com/constructs/Topic) constructs. |
| [bucket-notification](https://github.com/serverless-stack/serverless-stack/tree/master/examples/bucket-resize-image)                                          | Automatically resize images that are uploaded to an S3 bucket. Uses the [`Bucket`](https://docs.serverless-stack.com/constructs/Bucket) construct. |
| [vs-code](https://github.com/serverless-stack/examples/blob/main/vscode)                                                                                      | A walkthrough on how to use SST to debug Lambda functions live with VS Code. |
| [lambda-layer](https://github.com/serverless-stack/examples/blob/main/layer-chrome-aws-lambda)                                                                | Use Layers in your serverless app to take screenshots of webpages. Uses the [`Api`](https://docs.serverless-stack.com/constructs/Api) construct. |

## Documentation

Learn more about the SST.

- [Docs](https://docs.serverless-stack.com/)
- [@serverless-stack/cli](https://docs.serverless-stack.com/packages/cli)
- [@serverless-stack/resources](https://docs.serverless-stack.com/packages/resources)

## Contributing

To add an example:

1. Checkout this repo
2. Create a new directory at the root with the name of the example
3. Add the example code
4. Format the code by

   Running Prettier for JS at the root

   ```bash
   $ yarn
   $ yarn run prettier
   ```

   Running the following in a dir with Go files

   ```bash
   $ go fmt
   ```

5. Submit a PR!

And [join us on Slack](https://launchpass.com/serverless-stack).
