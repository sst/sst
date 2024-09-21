# SST v3

SST v3 uses a new engine for deploying SST apps. It uses Pulumi and Terraform, as opposed to CDK and CloudFormation. [Read the full announcement here]([https://sst.dev/blog/moving-away-from-cdk](https://sst.dev/blog/sst-v3)).

- **10x faster** deploys
- Native **multi-region** support
- No more cyclical dependencies
- No stacks or stack resource limits
- No CDK or npm package conflicts
- Native support for **non-AWS** providers

## Installation

If you are using SST as a part of your Node project, we recommend installing it locally.

```bash
npm install sst
```

If you are not using Node, you can install the CLI globally.

```bash
curl -fsSL https://sst.dev/install | bash
```

To install a specific version.

```bash
curl -fsSL https://sst.dev/install | VERSION=0.0.403 bash
```

To use a package manager, [check out our docs](https://sst.dev/docs/reference/cli/).

#### Manually

Download the pre-compiled binaries from the [releases](https://github.com/sst/ion/releases/latest) page and copy to the desired location.

## Get Started

Get started with your favorite framework:

- [Next.js](https://sst.dev/docs/start/aws/nextjs)
- [Remix](https://sst.dev/docs/start/aws/remix)
- [Astro](https://sst.dev/docs/start/aws/astro)
- [API](https://sst.dev/docs/start/aws/api)

## Learn More

Learn more about some of the key concepts:

- [Live](https://sst.dev/docs/live)
- [Linking](https://sst.dev/docs/linking)
- [Console](https://sst.dev/docs/console)
- [Components](https://sst.dev/docs/components)

## Contributing

Here's how you can contribute:

- Help us improve our docs
- Find a bug? Open an issue
- Feature request? Submit a PR 

## Running Locally

1. Clone the repo
2. `bun install`
3. `cd platform && bun run build`

Now you can run the CLI locally on any of the `examples/` apps.

```bash
cd examples/aws-api
go run ../../cmd/sst <command>
```

If you want to build the CLI, you can run `go build ./cmd/sst` from the root. This will create a
`sst` binary that you can use.

---

**Join our community** [Discord](https://sst.dev/discord) | [YouTube](https://www.youtube.com/c/sst-dev) | [Twitter](https://twitter.com/SST_dev)
