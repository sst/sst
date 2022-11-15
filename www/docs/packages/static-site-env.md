---
title: "@serverless-stack/static-site-env"
description: "Docs for the @serverless-stack/static-site-env package"
---

A simple CLI [`@serverless-stack/static-site-env`](https://www.npmjs.com/package/@serverless-stack/static-site-env) that allows your static site or Next.js app to load the environment variables from your SST app. This means that you won't have to hard code the config from your backend. Supports [Remix](../constructs/RemixSite.md#environment-variables), [Next.js](../constructs/NextjsSite.md#environment-variables), and [Static Sites](../constructs/StaticSite.md#environment-variables).

## Installation

Run the following in the root of your static site or Next.js app.

```bash
# With npm
npm install @serverless-stack/static-site-env --save-dev
# Or with Yarn
yarn add @serverless-stack/static-site-env --dev
```

## Usage

Once installed, tweak the start command in your `package.json` scripts.

Note that, you need to have `sst start` running for this to work.

### React.js

```json title="package.json" {2}
"scripts": {
  "start": "sst-env -- react-scripts start",
},
```

Start your local dev environment as usual.

```bash
npm run start
```

### Next.js

```json title="package.json" {2}
"scripts": {
  "dev": "sst-env -- next dev",
},
```

And run.

```bash
npm run dev
```

### Svelte

```json title="package.json" {2}
"scripts": {
  "dev": "sst-env -- vite",
},
```

And run.

```bash
npm run dev
```

## Options

### `--path`

A relative path to the directory containing the `sst.json` file.

Note that, the `sst-env` CLI will traverse up the directories to look for the root of your SST app. If the static site or Next.js app is located outside the SST app folder, for example:

```
/
  backend/
    sst.json
  frontend/
    package.json
```

Pass in `--path` to specify the relative path of the SST app.

```json title="package.json" {2}
"scripts": {
  "start": "sst-env --path ../backend -- react-scripts start",
},
```

## How it works

Here's what's going on behind the scenes.

1. The `sst start` command generates a file with the values specified by `StaticSite`, `RemixSite`, or `NextjsSite` construct's `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app. If the static site or Next.js app is located outside the SST app folder, pass in [`--path`](#--path) to specify the relative path of the SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.
