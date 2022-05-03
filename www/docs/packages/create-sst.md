---
title: create-sst
description: "Docs for the create-sst package"
---

A simple CLI [`create-sst`](https://www.npmjs.com/package/create-sst) that helps you create your SST projects.

## Usage

There's no need install this CLI. Just use it directly to create your projects.

With npx.

```bash
npx create-sst@latest
```

Or with npm 6+

```bash
npm init sst
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
