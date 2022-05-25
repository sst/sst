# @serverless-stack/resources

## 1.2.5

### Patch Changes

- [`c08edd77`](https://github.com/serverless-stack/serverless-stack/commit/c08edd77f6c48efcf790d8e4403c43e9803073ec) Thanks [@thdxr](https://github.com/thdxr)! - Update Script function to use ESM properly

- Updated dependencies []:
  - @serverless-stack/core@1.2.5

## 1.2.4

### Patch Changes

- [`ba08b788`](https://github.com/serverless-stack/serverless-stack/commit/ba08b7888c7aa2b19e9c3949f033c2b84a198923) Thanks [@thdxr](https://github.com/thdxr)! - Fix another use of `require.resolve`

- Updated dependencies [[`66f763b8`](https://github.com/serverless-stack/serverless-stack/commit/66f763b899bdf5087c109384033a16860fac9b1c)]:
  - @serverless-stack/core@1.2.4

## 1.2.3

### Patch Changes

- Updated dependencies [[`a2086191`](https://github.com/serverless-stack/serverless-stack/commit/a20861911859b3a48f668b2eb1f113e896cb851b)]:
  - @serverless-stack/core@1.2.3

## 1.2.2

### Patch Changes

- [#1728](https://github.com/serverless-stack/serverless-stack/pull/1728) [`3229694c`](https://github.com/serverless-stack/serverless-stack/commit/3229694ceee9f18d008a621705d46c28e9ca2f35) Thanks [@thdxr](https://github.com/thdxr)! - Move graphql to peer dependencies by implementing weakImport. If you are using the AppSyncApi construct be sure to add `graphql` and `@graphql-tools/merge` to your dependencies.

- Updated dependencies [[`3229694c`](https://github.com/serverless-stack/serverless-stack/commit/3229694ceee9f18d008a621705d46c28e9ca2f35)]:
  - @serverless-stack/core@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [[`d90a1989`](https://github.com/serverless-stack/serverless-stack/commit/d90a1989411fa5d868778d2e686323ad08e33efb)]:
  - @serverless-stack/core@1.2.1

## 1.2.0

### Minor Changes

- [#1710](https://github.com/serverless-stack/serverless-stack/pull/1710) [`e170ea3f`](https://github.com/serverless-stack/serverless-stack/commit/e170ea3fb586cbe36e11beb8f9d9af4f420c2d7e) Thanks [@thdxr](https://github.com/thdxr)! - Moved codebase to ESM. This should not have any impact on your codebase if you are not using ESM. If you are using ESM and you are using an esbuild plugin, be sure to rename your plugins file to have a .cjs extension

### Patch Changes

- [#1719](https://github.com/serverless-stack/serverless-stack/pull/1719) [`3610b5da`](https://github.com/serverless-stack/serverless-stack/commit/3610b5da4f57fd35f1fb824701b7bfc4e8ce1a83) Thanks [@fwang](https://github.com/fwang)! - Function: add support for dotnet (.NET 6) runtime

* [#1716](https://github.com/serverless-stack/serverless-stack/pull/1716) [`480ce263`](https://github.com/serverless-stack/serverless-stack/commit/480ce26378962d3ced737624dad4734cd7ad2b53) Thanks [@fwang](https://github.com/fwang)! - Cron: support disabling cron job

- [`9f6c465a`](https://github.com/serverless-stack/serverless-stack/commit/9f6c465a71ecb7b074fed4a45960f4600fde6202) Thanks [@thdxr](https://github.com/thdxr)! - Mark resources package as ESM

* [#1705](https://github.com/serverless-stack/serverless-stack/pull/1705) [`1e8b6416`](https://github.com/serverless-stack/serverless-stack/commit/1e8b64164090a4f72c53b8233411a0680342b0b8) Thanks [@fwang](https://github.com/fwang)! - Queue: expose queueUrl property

* Updated dependencies [[`3610b5da`](https://github.com/serverless-stack/serverless-stack/commit/3610b5da4f57fd35f1fb824701b7bfc4e8ce1a83), [`e170ea3f`](https://github.com/serverless-stack/serverless-stack/commit/e170ea3fb586cbe36e11beb8f9d9af4f420c2d7e), [`0bc69b52`](https://github.com/serverless-stack/serverless-stack/commit/0bc69b520f68dc5325b974386170d3db0d21416c)]:
  - @serverless-stack/core@1.2.0

## 1.1.2

### Patch Changes

- Updated dependencies [[`3927251b`](https://github.com/serverless-stack/serverless-stack/commit/3927251bbc834009ea19654f54a4e6c935ea90e9)]:
  - @serverless-stack/core@1.1.2

## 1.1.1

### Patch Changes

- Updated dependencies [[`b81522a4`](https://github.com/serverless-stack/serverless-stack/commit/b81522a4dd0789292a4300b5465c4cab13f7a0cc)]:
  - @serverless-stack/core@1.1.1

## 1.1.0

### Minor Changes

- 5860eb64: Update CDK to 2.24.0

### Patch Changes

- Updated dependencies [5860eb64]
  - @serverless-stack/core@1.1.0

## 1.0.12

### Patch Changes

- 31ec3eb1: Added release snapshot script
- Updated dependencies [31ec3eb1]
  - @serverless-stack/core@1.0.12

## 1.0.11

### Patch Changes

- Updated dependencies [78cb27fb]
  - @serverless-stack/core@1.0.11
