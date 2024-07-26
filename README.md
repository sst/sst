# ❍

Ion is a new engine for deploying SST apps. It uses Pulumi and Terraform, as opposed to CDK and CloudFormation. [Read the full announcement here](https://sst.dev/blog/moving-away-from-cdk.html).

- **10x faster** deploys
- Native **multi-region** support
- No more cyclical dependencies
- No stacks or stack resource limits
- No CDK or npm package conflicts
- Native support for **non-AWS** providers

_Note: Ion is generally available and recommended for new SST users. We are working on a migration path for SST v2 users._

## Installation

```bash
curl -fsSL https://ion.sst.dev/install | bash
```

To install a specific version.

```bash
curl -fsSL https://ion.sst.dev/install | VERSION=0.0.403 bash
```

To use a package manager, [check out our docs](https://ion.sst.dev/docs/reference/cli/).

#### Manually

Download the pre-compiled binaries from the [releases](https://github.com/sst/ion/releases/latest) page and copy to the desired location.

## Get Started

Get started with your favorite framework:

- [Next.js](https://ion.sst.dev/docs/start/aws/nextjs)
- [Remix](https://ion.sst.dev/docs/start/aws/remix)
- [Astro](https://ion.sst.dev/docs/start/aws/astro)
- [API](https://ion.sst.dev/docs/start/aws/api)

## Learn More

Learn more about some of the key concepts:

- [Live](https://ion.sst.dev/docs/live)
- [Linking](https://ion.sst.dev/docs/linking)
- [Console](https://ion.sst.dev/docs/console)
- [Components](https://ion.sst.dev/docs/components)

## Contributing

Here's how you can contribute:

- Help us improve our docs
- Find a bug? Open an issue
- Feature request? Submit a PR 

Join the [#ion channel](https://sst.dev/discord) to learn more.

---

**Join our community** [Discord](https://sst.dev/discord) | [YouTube](https://www.youtube.com/c/sst-dev) | [Twitter](https://twitter.com/SST_dev)
