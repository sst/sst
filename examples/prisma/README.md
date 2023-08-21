# How to use Prisma with SST

## Getting Started

Install the example.

```bash
$ npx create-sst@latest --template=examples/prisma
# Or with Yarn
$ yarn create sst --template=examples/prisma
# Or with PNPM
$ pnpm create sst --template=examples/prisma
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

- [Docs](https://docs.sst.dev/)
- [sst](https://docs.sst.dev/packages/sst)
