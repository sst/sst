# How to use Prisma with SST

## Getting Started

Install the example.

```bash
$ npm init serverless-stack --example prisma
# Or with Yarn
$ yarn create serverless-stack --example prisma
```

## Prisma

See the [example stack](stacks/index.ts) to see how the Prisma integration works. It creates a reusable Prisma layer that contains the necessary binaries that can be attached to all functions that need it. The only change required to your `schema.prisma` is the following, to pull the binary code needed for the AWS Lambda environment:

```
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
}
```

Make sure you generate the prisma code before you run `sst start` or `sst deploy`

```bash
$ yarn prisma generate
```

## Documentation

Learn more about the SST.

- [Docs](https://docs.serverless-stack.com/)
- [@serverless-stack/cli](https://docs.serverless-stack.com/packages/cli)
- [@serverless-stack/resources](https://docs.serverless-stack.com/packages/resources)
