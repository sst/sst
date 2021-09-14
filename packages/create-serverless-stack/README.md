# create-serverless-stack [![npm](https://img.shields.io/npm/v/create-serverless-stack.svg?style=flat-square)](https://www.npmjs.com/package/create-serverless-stack)

A simple CLI (`create-serverless-stack`) that helps you create your Serverless Stack projects.

[View the create-serverless-stack docs here](https://docs.serverless-stack.com/packages/create-serverless-stack).

## Usage

There's no need install this CLI. Just use it directly to create your projects.

With npx.

```bash
$ npx create-serverless-stack@latest my-sst-app
```

Or with npm 6+

```bash
$ npm init serverless-stack@latest my-sst-app
```

Or with Yarn 0.25+

```bash
$ yarn create serverless-stack my-sst-app
```

This will create an app in the `my-sst-app/` directory.

## Options

Pass in the following (optional) options.

### `--language`

The language of the project: `javascript`, `typescript`, `python`, `go`, `csharp`, or `fsharp`. Defaults to `javascript`. For example:

```bash
$ npm init serverless-stack@latest my-sst-app -- --language typescript
```

Note that extra `--` when using `npm init`.

### `--example`

Creates a project using one of [our examples](https://github.com/serverless-stack/serverless-stack/tree/master/examples). Pass in the name of the example you want.

```bash
$ npx create-serverless-stack@latest --example rest-api

# Or
$ npm init serverless-stack --example rest-api
$ yarn create serverless-stack --example rest-api
```

You can also pass in a name for your app.

``` bash
$ npx create-serverless-stack@latest --example rest-api my-sst-api
```

### `--use-yarn`

Use Yarn instead of npm as the packager. Defaults to npm. For example:

```bash
$ yarn create serverless-stack my-sst-app --use-yarn
```
