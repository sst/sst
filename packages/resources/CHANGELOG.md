# @serverless-stack/resources

## 1.2.12

### Patch Changes

- [#1764](https://github.com/serverless-stack/serverless-stack/pull/1764) [`46314f3c`](https://github.com/serverless-stack/serverless-stack/commit/46314f3ca857f5a5c6a58e4c333bd9e670769279) Thanks [@thdxr](https://github.com/thdxr)! - Generate types for RDS construct using sql-ts

- Updated dependencies [[`46314f3c`](https://github.com/serverless-stack/serverless-stack/commit/46314f3ca857f5a5c6a58e4c333bd9e670769279), [`3879c501`](https://github.com/serverless-stack/serverless-stack/commit/3879c501b36195b81c2717d848cc4d06a78c06b6)]:
  - @serverless-stack/core@1.2.12

## 1.2.11

### Patch Changes

- Updated dependencies [[`c829dfa6`](https://github.com/serverless-stack/serverless-stack/commit/c829dfa600b55a3d82495756e7489b858f8a01d0)]:
  - @serverless-stack/core@1.2.11

## 1.2.10

### Patch Changes

- Updated dependencies [[`95b508ce`](https://github.com/serverless-stack/serverless-stack/commit/95b508ce3e702531f2fe09bd3c83f5ed86eae015)]:
  - @serverless-stack/core@1.2.10

## 1.2.9

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/core@1.2.9

## 1.2.8

### Patch Changes

- [#1744](https://github.com/serverless-stack/serverless-stack/pull/1744) [`6c94940d`](https://github.com/serverless-stack/serverless-stack/commit/6c94940d2548426f32503dea338d891f02d6676a) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support reusing CloudFront Origin Request Policy

* [#1742](https://github.com/serverless-stack/serverless-stack/pull/1742) [`b4f83734`](https://github.com/serverless-stack/serverless-stack/commit/b4f8373449a27ca0d9a87cb99053fa7d69828c66) Thanks [@fwang](https://github.com/fwang)! - WebSocketApi: add getRoute() to make WebSocketRoute accessible

* Updated dependencies []:
  - @serverless-stack/core@1.2.8

## 1.2.7

### Patch Changes

- [`bf52329a`](https://github.com/serverless-stack/serverless-stack/commit/bf52329a5089af2c095fa8ab3c4c2409ade13b31) Thanks [@thdxr](https://github.com/thdxr)! - Fix ESM issues with cross-region-helper utility for NextJS Site

* [#1743](https://github.com/serverless-stack/serverless-stack/pull/1743) [`9a9df64a`](https://github.com/serverless-stack/serverless-stack/commit/9a9df64a18ff135ff36ddd9fbdee1899f53ce01e) Thanks [@thdxr](https://github.com/thdxr)! - Fix dirname issue in Script construct

* Updated dependencies [[`4be3e5c7`](https://github.com/serverless-stack/serverless-stack/commit/4be3e5c76184d43303ee477cf51104a6f4f744a4)]:
  - @serverless-stack/core@1.2.7

## 1.2.6

### Patch Changes

- [`a245f5af`](https://github.com/serverless-stack/serverless-stack/commit/a245f5aff231fd3dd4828508adf70e708f6abb4d) Thanks [@thdxr](https://github.com/thdxr)! - Fix ESM issue in python bundling file

* [`73fc7801`](https://github.com/serverless-stack/serverless-stack/commit/73fc78010581c6221e6a92e8fc5825a224ce6ec3) Thanks [@thdxr](https://github.com/thdxr)! - Fallback to require for aws-sdk in Script handler

* Updated dependencies []:
  - @serverless-stack/core@1.2.6

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
