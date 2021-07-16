---
title: create-serverless-stack
description: "Docs for the create-serverless-stack package"
---

A simple CLI (`create-serverless-stack`) that helps you create your Serverless Stack projects.

## Usage

There's no need install this CLI. Just use it directly to create your projects.

With npx.

```bash
npx create-serverless-stack@latest my-sst-app
```

Or with npm 6+

```bash
npm init serverless-stack@latest my-sst-app
```

Or with Yarn 0.25+

```bash
yarn create serverless-stack my-sst-app
```

This will create an app in the `my-sst-app/` directory.

## Options

Pass in the following (optional) options.

### `--language`

The language of the project: `javascript`, `typescript`, `python`, or `go`. Defaults to `javascript`. For example:

```bash
npm init serverless-stack@latest my-sst-app -- --language typescript
```

Note that extra `--` when using `npm init`.

### `--use-yarn`

Use Yarn instead of npm as the packager. Defaults to npm. For example:

```bash
yarn create serverless-stack my-sst-app --use-yarn
```
