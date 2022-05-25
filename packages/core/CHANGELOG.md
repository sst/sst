# @serverless-stack/core

## 1.2.6

## 1.2.5

## 1.2.4

### Patch Changes

- [`66f763b8`](https://github.com/serverless-stack/serverless-stack/commit/66f763b899bdf5087c109384033a16860fac9b1c) Thanks [@thdxr](https://github.com/thdxr)! - Granular bundling for stacks code

## 1.2.3

### Patch Changes

- [#1730](https://github.com/serverless-stack/serverless-stack/pull/1730) [`a2086191`](https://github.com/serverless-stack/serverless-stack/commit/a20861911859b3a48f668b2eb1f113e896cb851b) Thanks [@thdxr](https://github.com/thdxr)! - Fix issue with ws dependency preventing local server from starting

## 1.2.2

### Patch Changes

- [#1728](https://github.com/serverless-stack/serverless-stack/pull/1728) [`3229694c`](https://github.com/serverless-stack/serverless-stack/commit/3229694ceee9f18d008a621705d46c28e9ca2f35) Thanks [@thdxr](https://github.com/thdxr)! - Move graphql to peer dependencies by implementing weakImport. If you are using the AppSyncApi construct be sure to add `graphql` and `@graphql-tools/merge` to your dependencies.

## 1.2.1

### Patch Changes

- [`d90a1989`](https://github.com/serverless-stack/serverless-stack/commit/d90a1989411fa5d868778d2e686323ad08e33efb) Thanks [@thdxr](https://github.com/thdxr)! - Include graphql as a core dependency

## 1.2.0

### Minor Changes

- [#1710](https://github.com/serverless-stack/serverless-stack/pull/1710) [`e170ea3f`](https://github.com/serverless-stack/serverless-stack/commit/e170ea3fb586cbe36e11beb8f9d9af4f420c2d7e) Thanks [@thdxr](https://github.com/thdxr)! - Moved codebase to ESM. This should not have any impact on your codebase if you are not using ESM. If you are using ESM and you are using an esbuild plugin, be sure to rename your plugins file to have a .cjs extension

### Patch Changes

- [#1719](https://github.com/serverless-stack/serverless-stack/pull/1719) [`3610b5da`](https://github.com/serverless-stack/serverless-stack/commit/3610b5da4f57fd35f1fb824701b7bfc4e8ce1a83) Thanks [@fwang](https://github.com/fwang)! - Function: add support for dotnet (.NET 6) runtime

* [#1715](https://github.com/serverless-stack/serverless-stack/pull/1715) [`0bc69b52`](https://github.com/serverless-stack/serverless-stack/commit/0bc69b520f68dc5325b974386170d3db0d21416c) Thanks [@fwang](https://github.com/fwang)! - Load .env files for debug stack

## 1.1.2

### Patch Changes

- [`3927251b`](https://github.com/serverless-stack/serverless-stack/commit/3927251bbc834009ea19654f54a4e6c935ea90e9) Thanks [@thdxr](https://github.com/thdxr)! - Remove strict null checks for warning JS users

## 1.1.1

### Patch Changes

- [#1698](https://github.com/serverless-stack/serverless-stack/pull/1698) [`b81522a4`](https://github.com/serverless-stack/serverless-stack/commit/b81522a4dd0789292a4300b5465c4cab13f7a0cc) Thanks [@thdxr](https://github.com/thdxr)! - My test feature

## 1.1.0

### Minor Changes

- 5860eb64: Update CDK to 2.24.0

## 1.0.12

### Patch Changes

- 31ec3eb1: Added release snapshot script

## 1.0.11

### Patch Changes

- 78cb27fb: Removed unused dependency on dataloader
