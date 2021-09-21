# @serverless-stack/static-site-env [![npm](https://img.shields.io/npm/v/@serverless-stack/static-site-env.svg?style=flat-square)](https://www.npmjs.com/package/@serverless-stack/static-site-env)

A simple CLI ([`@serverless-stack/static-site-env`](https://www.npmjs.com/package/@serverless-stack/static-site-env) that allows your static site to load the environment variables from your SST app. This means that you won't have to hard code the config from your backend. Supports [React.js](https://docs.serverless-stack.com/constructs/ReactStaticSite#configuring-environment-variables) and [Next.js](https://docs.serverless-stack.com/constructs/NextjsSite#configuring-environment-variables).

## Installation

Run the following in the root of your static site.

```bash
# With npm
npm install @serverless-stack/static-site-env --save-dev
# Or with Yarn
yarn add @serverless-stack/static-site-env --dev
```

## Usage

Once installed, tweak the start command in your React app's `package.json` scripts. 

```json title="package.json" {2}
"scripts": {
  "start": "sst-env -- react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
},
```

Now start your local dev environment as usual.

``` bash
npm run start
```

For Next.js:

```json title="package.json" {2}
"scripts": {
  "dev": "sst-env -- next dev",
  "build": "next build",
  "start": "next start"
},
```

And run.

``` bash
npm run dev
```

Note that, you need to have `sst start` running for this to work.

## How it works

Here's what's going on behind the scenes.

1. The `sst start` command generates a file with the values specified by `ReactStaticSite` or `NextjsSite` construct's `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

Note that, `sst-env` only works if the React or Next.js app is located inside the SST app or inside one of its subdirectories.
