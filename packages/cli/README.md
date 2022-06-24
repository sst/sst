# @serverless-stack/cli [![npm](https://img.shields.io/npm/v/@serverless-stack/cli.svg?style=flat-square)](https://www.npmjs.com/package/@serverless-stack/cli)

<img alt="Logo" align="right" src="https://raw.githubusercontent.com/serverless-stack/identity/main/sst.svg" width="20%" />

Part of the **[SST Framework](https://github.com/serverless-stack/sst)**. The `sst` CLI allows you to build, deploy, and test SST apps.

[View the @serverless-stack/cli docs here](https://docs.sst.dev/packages/cli).

## Quick Start

Create your first SST app.

```bash
# Create your app
$ npm init sst
$ cd my-sst-app
$ npm i

# Start Live Lambda Development
$ npm start

# Deploy to prod
$ npx sst deploy --stage prod
```

[![sst start](https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-2.gif)](https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-2.mp4)

## Live Lambda Development

The `sst start` command starts up a local development environment that opens a WebSocket connection to your deployed app and proxies any Lambda requests to your local machine. This allows you to:

- Work on your Lambda functions locally
- Supports all Lambda triggers, so there's no need to mock API Gateway, SQS, SNS, etc.
- Supports real Lambda environment variables and Lambda IAM permissions
- And it's fast. There's nothing to deploy when you make a change!

[Read more about Live Lambda Development](https://docs.sst.dev/live-lambda-development).

## Documentation

[**Check out the SST docs**](https://docs.sst.dev)
