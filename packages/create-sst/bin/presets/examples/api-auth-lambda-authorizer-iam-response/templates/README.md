# How to add Lambda authorizer with IAM policy response to a serverless API

An example serverless app created with SST.

This example creates an Api endpoint with a `/private` route and a `/public` route. The `/private` route is protected with a Lambda authorizer. The authorizer checks for the Authentication header, and authorizes the request if the Basic auth username is `admin` and the password is `password`.

## Getting Started

Install the example.

```bash
$ npm init serverless-stack --example api-auth-lambda-authorizer-iam-response
# Or with Yarn
$ yarn create serverless-stack --example api-auth-lambda-authorizer-iam-response
```

Start the Live Lambda Development environment.

```bash
$ npm run start
```

Test the `/public` endpoint.

```bash
$ curl https://xxxxxxxxxx.execute-api.region.amazonaws.com/public
```

Test the `/private` endpoint with an invalid username and password.

```bash
$ curl -u foo:password https://xxxxxxxxxx.execute-api.region.amazonaws.com/private
```

Test the `/private` endpoint with a valid username and password.

```bash
$ curl -u admin:password https://xxxxxxxxxx.execute-api.region.amazonaws.com/private
```

Note that the first time you hit the `/private` endpoint with a given username and password, the Lambda authorizer gets invoked to check the credentials. The authorization response will be cached for 5 minutes. Subsequent requests to `/private` with `foo:password` would fail right away without invoking the authorizer function. Similarly, subsequent requests to `/private` with `admin:password` would bypass the authorizer function.

## Commands

### `npm run start`

Starts the Live Lambda Development environment.

### `npm run build`

Build your app and synthesize your stacks.

### `npm run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy, a specific stack.

### `npm run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally removes, a specific stack.

### `npm run test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

## Documentation

Learn more about the SST.

- [Docs](https://docs.serverless-stack.com/)
- [@serverless-stack/cli](https://docs.serverless-stack.com/packages/cli)
- [@serverless-stack/resources](https://docs.serverless-stack.com/packages/resources)
