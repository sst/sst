<p align="center">
  <img alt="create sst" src="https://raw.githubusercontent.com/serverless-stack/identity/main/create-sst/create-sst.svg" width="300" />
</p>

<p align="center">
  <a href="https://serverless-stack.com/slack"><img alt="Slack" src="https://img.shields.io/badge/Slack-chat-blue?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/create-sst"><img alt="npm" src="https://img.shields.io/npm/v/create-sst?style=flat-square" /></a>
  <a href="https://github.com/serverless-stack/serverless-stack/actions/workflows/ci.yml"><img alt="Build status" src="https://img.shields.io/github/workflow/status/serverless-stack/serverless-stack/CI?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=wBTDkLIyMhw">
    <img alt="Launch: create sst" src="social-share.png?raw=true&sanitize=true" width="600" />
  </a>
</p>

---

The [`create sst`](https://www.npmjs.com/package/create-sst) helps you create your for your [SST](/) projects. By default, it bootstraps a full-stack starter.

## Usage

There's no need install this CLI. Just use it directly to create your projects.

With npx.

```bash
npx create-sst@latest
```

Or with npm 6+

```bash
npm create sst
```

Or with Yarn 0.25+

```bash
yarn create sst
```

This will create an app in the `my-sst-app/` directory.

## Options

Pass in the following (optional) options.

### `--examples`

Instead of the starters, this will list our examples if you'd like to copy one of them to try it out.

```bash
npx create-sst@latest --examples
```

## Arguments

Pass in the following (optional) arguments.

### `<template>`

Specify a template instead of choosing from the interactive menu

```bash
npx create-sst@latest typescript-starter
```

### `<destination>`

Specify a destination directory instead of typing it into the interactive prompt

```bash
npx create-sst@latest typescript-starter my-sst-app
```

Note that extra `--` when using `npm init`.

## Documentation

[**Get started with SST**](https://docs.serverless-stack.com/learn)
