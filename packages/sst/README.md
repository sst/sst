# sst

[SST](https://sst.dev) makes it easy to build modern full-stack applications on AWS.

The `sst` package is made up of the following.

- [`sst`](https://docs.sst.dev/packages/sst) CLI
- [`sst/node`](https://docs.sst.dev/clients) Node.js client
- [`sst/constructs`](https://docs.sst.dev/constructs) CDK constructs

## Installation

Install the `sst` package in your project root.

```bash
npm install sst --save-exact
```

## Usage

Once installed, you can run the CLI commands using.

```bash
npx sst <command>
```

Import the Node.js client in your functions. For example, you can import the `Bucket` client.

```ts
import { Bucket } from "sst/node/bucket";
```

And import the constructs you need in your stacks code. For example, you can add an API.

```ts
import { Api } from "sst/constructs";
```

For more details, [head over to our docs](https://docs.sst.dev).

---

**Join our community** [Discord](https://sst.dev/discord) | [YouTube](https://www.youtube.com/c/sst-dev) | [Twitter](https://twitter.com/SST_dev)
