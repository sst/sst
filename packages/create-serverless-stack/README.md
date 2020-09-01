# create-serverless-stack [![npm](https://img.shields.io/npm/v/create-serverless-stack)](https://www.npmjs.com/package/create-serverless-stack)

Part of the **[Serverless Stack Toolkit](https://github.com/serverless-stack/serverless-stack)**. A simple CLI (`create-serverless-stack`) that helps you create your Serverless Stack projects.

## Usage

There's no need install this CLI. Just use it directly to create your projects.

With npx.

```bash
$ npx create-serverless-stack resources my-sst-app
```

Or with npm 6+

```bash
$ npm init serverless-stack resources my-sst-app
```

Or with Yarn 0.25+

```bash
$ yarn create serverless-stack resources my-sst-app
```

This will create an app in the `my-sst-app/` directory.

## Options

Pass in the following (optional) options.

### `--language`

The language of the project: `javascript` or `typescript`. Defaults to `javascript`. For example:

```bash
$ npm init serverless-stack resources my-sst-app --language typescript
```

### `--use-yarn`

Use Yarn instead of npm as the packager. Defaults to npm. For example:

```bash
$ yarn create serverless-stack resources my-sst-app --use-yarn
```
