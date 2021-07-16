# @serverless-stack/static-site-env [![npm](https://img.shields.io/npm/v/@serverless-stack/static-site-env.svg?style=flat-square)](https://www.npmjs.com/package/@serverless-stack/static-site-env)

A simple CLI (`@serverless-stack/static-site-env`) that allows your static site to load the environment variables from your SST app. This means that you won't have to hard code the config from your backend.

Read more about how this works over on the [`ReactStaticSite` doc](https://docs.serverless-stack.com/constructs/ReactStaticSite#configuring-custom-domains).

[View the @serverless-stack/static-site-env docs here](https://docs.serverless-stack.com/packages/static-site-env).

## Installation

Run the following in the root of your static site.

```bash
# With npm
$ npm install @serverless-stack/static-site-env --save-dev
# Or with Yarn
$ yarn add @serverless-stack/static-site-env --dev
```

## Usage

Once installed, tweak the start command in your `package.json` scripts.

```json title="package.json" {2}
"scripts": {
  "start": "sst-env -- react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
},
```

Now start your static site as usual.

```bash
$ npm run start
```

Note that, you need to have `sst start` running for this to work.

## How it works

Here's what's going on behind the scenes.

1. The `sst start` command generates a file with the values specified by `ReactStaticSite`'s `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

Note that, `sst-env` only works if the React app is located inside the SST app or inside one of its subdirectories.
