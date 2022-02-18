---
title: Linting and Type Checking
description: "Configuring linting and type check in Serverless Stack (SST)"
---

## Configuring linting

For JavaScript and TypeScript apps, SST will automatically lint your code when building or deploying using our default linting rules. This is configured in `package.json` and will be picked up by your editor plugins:
```json title="package.json"
{
  "eslintConfig": {
    "extends": [
      "serverless-stack"
    ]
  }
}
```

If you'd like to customize the lint rules, you can modify the `package.json` to extend a different config or add your own rules. You can also create an `.eslintrc` file if you prefer.

Note that, using the `.eslintignore` file is not currently supported. If you'd like to turn off linting, set `"lint": false` in your `sst.json`.

If you want to ignore specific files, use the [`ignorePatterns`](https://eslint.org/docs/user-guide/configuring/ignoring-code#ignorepatterns-in-config-files) option in your `.eslintrc.json`.

```json {2}
{
  "ignorePatterns": ["temp.js", "**/vendor/*.js"],
  "rules": {
    //...
  }
}
```

## Type checking

If you are using TypeScript, SST also runs a separate TypeScript process to type check your code. It uses the `tsconfig.json` in your project root for this. This applies to the Lambda functions in your app as well.

## Disabling linting and type checking

You can also disable linting and type checking using the `sst.json`.

```json title="sst.json" {4-5}
{
  "name": "my-sst-app",
  "region": "us-east-1",
  "lint": false,
  "typeCheck": false
}
```
