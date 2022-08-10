# @serverless-stack/core

## 1.6.10

## 1.6.9

## 1.6.8

## 1.6.7

## 1.6.6

## 1.6.5

### Patch Changes

- [`4cd71c933`](https://github.com/serverless-stack/sst/commit/4cd71c93392a7ffe53143ff8253fd326ee0bd058) Thanks [@thdxr](https://github.com/thdxr)! - Kill local function every 30min so that credentials refresh

## 1.6.4

### Patch Changes

- [`1618cd8d5`](https://github.com/serverless-stack/sst/commit/1618cd8d5ad8e7e1270027a6ab01b9a908c1127a) Thanks [@thdxr](https://github.com/thdxr)! - Support banner option in node functions

## 1.6.3

## 1.6.2

## 1.6.1

## 1.6.0

## 1.5.2

## 1.5.1

### Patch Changes

- [`bb2d93c40`](https://github.com/serverless-stack/sst/commit/bb2d93c401f460ebfa36ec62457e70a653b292e7) Thanks [@thdxr](https://github.com/thdxr)! - Bug fix for multi region stacks crashing sst start

## 1.5.0

### Minor Changes

- [#1882](https://github.com/serverless-stack/sst/pull/1882) [`e4d350749`](https://github.com/serverless-stack/sst/commit/e4d35074904b8fdea0dfb4d9f3a9e6e19708038f) Thanks [@fwang](https://github.com/fwang)! - Update CDK to 2.32.0

## 1.4.1

### Patch Changes

- [`02d5c7ee9`](https://github.com/serverless-stack/sst/commit/02d5c7ee92a275f9ad07cb9840632c1901b43d92) Thanks [@thdxr](https://github.com/thdxr)! - Fix CORS issue on ping endpoint for console testing websocket

## 1.4.0

### Minor Changes

- [#1800](https://github.com/serverless-stack/sst/pull/1800) [`30ca1ca82`](https://github.com/serverless-stack/sst/commit/30ca1ca8237ad666214e9d4e73a7e24f7cd094c8) Thanks [@ctrlplusb](https://github.com/ctrlplusb)! - Add RemixSite construct

## 1.3.0

## 1.2.36

## 1.2.35

## 1.2.34

## 1.2.33

## 1.2.32

### Patch Changes

- [#1633](https://github.com/serverless-stack/sst/pull/1633) [`8d4ce71ca`](https://github.com/serverless-stack/sst/commit/8d4ce71ca8100da707feecf97d9393ac30130cc1) Thanks [@fwang](https://github.com/fwang)! - Support SSL cert generation for local server enabling Safari and Brave support

## 1.2.31

## 1.2.30

## 1.2.29

### Patch Changes

- [#1839](https://github.com/serverless-stack/sst/pull/1839) [`75145db8`](https://github.com/serverless-stack/sst/commit/75145db83f89e60694685b99c76851ca95d988e4) Thanks [@thdxr](https://github.com/thdxr)! - Warm up RDS instance on sst start in case it's asleep

## 1.2.28

## 1.2.27

## 1.2.26

## 1.2.25

### Patch Changes

- [#1816](https://github.com/serverless-stack/sst/pull/1816) [`fd8330bf`](https://github.com/serverless-stack/sst/commit/fd8330bfe53934691c9d74b273a0109120c68bcf) Thanks [@fwang](https://github.com/fwang)! - Cli: fix sst start error "stack does not exist" when custom stack name used

## 1.2.24

## 1.2.23

## 1.2.22

## 1.2.21

### Patch Changes

- [`b140d04e`](https://github.com/serverless-stack/sst/commit/b140d04e8d80ed03ab1547b01215d5eb0c1aebda) Thanks [@thdxr](https://github.com/thdxr)! - Support MySQL type generation

## 1.2.20

### Patch Changes

- [#1801](https://github.com/serverless-stack/sst/pull/1801) [`edcd89d2`](https://github.com/serverless-stack/sst/commit/edcd89d2c3f803e801d744dd91c13fd301a5d87a) Thanks [@fwang](https://github.com/fwang)! - sst start: update static-site-environment-output-keys.json on redeploy

* [#1793](https://github.com/serverless-stack/sst/pull/1793) [`960575f0`](https://github.com/serverless-stack/sst/commit/960575f0a66ba1b12806244b728f7fb6254674bc) Thanks [@fwang](https://github.com/fwang)! - Cli: check for invalid stages names

## 1.2.19

## 1.2.18

### Patch Changes

- [`3983cf5f`](https://github.com/serverless-stack/sst/commit/3983cf5ff7b21cf4a41d59deffecf9b4f9e3f84c) Thanks [@thdxr](https://github.com/thdxr)! - Add sourcemap property to control sourcemap generation for NodeJS functions. This defaults to `false` when deployed so be sure to set it if you want sourcemap support

## 1.2.17

### Patch Changes

- [#1758](https://github.com/serverless-stack/sst/pull/1758) [`ebd05ff4`](https://github.com/serverless-stack/sst/commit/ebd05ff4c7d24498758c07c29b0d897fcfd4832f) Thanks [@dennistruemper](https://github.com/dennistruemper)! - Golang: set GOARCH when bundling for `sst deploy`

## 1.2.16

### Patch Changes

- [#1780](https://github.com/serverless-stack/sst/pull/1780) [`46831e9b`](https://github.com/serverless-stack/sst/commit/46831e9bc067116ca0281e5a0e98a86edae8971e) Thanks [@fwang](https://github.com/fwang)! - Function: referencing layers from another stack results in no changes when layer code did change

* [#1784](https://github.com/serverless-stack/sst/pull/1784) [`1e02e312`](https://github.com/serverless-stack/sst/commit/1e02e312e54d1c8a7280a1d72da3b670575d67ae) Thanks [@thdxr](https://github.com/thdxr)! - Update RDS migrator to use ESM. Make sure to upgrade `kysely-data-api` to 0.0.11 as well.

## 1.2.15

## 1.2.14

### Patch Changes

- [`eec3ad28`](https://github.com/serverless-stack/sst/commit/eec3ad28a0edae50c2086019cb21c47a0b8526c5) Thanks [@thdxr](https://github.com/thdxr)! - Properly bust pothos cache when refreshing schema

* [`db06a415`](https://github.com/serverless-stack/sst/commit/db06a415c6cee32d198e3582e6f1e775209eed5b) Thanks [@thdxr](https://github.com/thdxr)! - Fix for esbuild entrypoint in windows

## 1.2.13

### Patch Changes

- [`fa1bea79`](https://github.com/serverless-stack/sst/commit/fa1bea79ba5592ce084f40447fc7f015bec1fc43) Thanks [@thdxr](https://github.com/thdxr)! - Skip Kysely type generation when migrations are not in use

## 1.2.12

### Patch Changes

- [#1764](https://github.com/serverless-stack/sst/pull/1764) [`46314f3c`](https://github.com/serverless-stack/sst/commit/46314f3ca857f5a5c6a58e4c333bd9e670769279) Thanks [@thdxr](https://github.com/thdxr)! - Generate types for RDS construct using sql-ts

* [`3879c501`](https://github.com/serverless-stack/sst/commit/3879c501b36195b81c2717d848cc4d06a78c06b6) Thanks [@thdxr](https://github.com/thdxr)! - Fix for pothos extracting enumType when passed inline

## 1.2.11

### Patch Changes

- [`c829dfa6`](https://github.com/serverless-stack/sst/commit/c829dfa600b55a3d82495756e7489b858f8a01d0) Thanks [@thdxr](https://github.com/thdxr)! - Update JS typechecker to use latest lib + ignore node_modules

## 1.2.10

### Patch Changes

- [`95b508ce`](https://github.com/serverless-stack/sst/commit/95b508ce3e702531f2fe09bd3c83f5ed86eae015) Thanks [@thdxr](https://github.com/thdxr)! - Added support for Pothos classes and enums

## 1.2.9

## 1.2.8

## 1.2.7

### Patch Changes

- [#1740](https://github.com/serverless-stack/sst/pull/1740) [`4be3e5c7`](https://github.com/serverless-stack/sst/commit/4be3e5c76184d43303ee477cf51104a6f4f744a4) Thanks [@thdxr](https://github.com/thdxr)! - Fix \_\_dirname issue with python bundler

## 1.2.6

## 1.2.5

## 1.2.4

### Patch Changes

- [`66f763b8`](https://github.com/serverless-stack/sst/commit/66f763b899bdf5087c109384033a16860fac9b1c) Thanks [@thdxr](https://github.com/thdxr)! - Granular bundling for stacks code

## 1.2.3

### Patch Changes

- [#1730](https://github.com/serverless-stack/sst/pull/1730) [`a2086191`](https://github.com/serverless-stack/sst/commit/a20861911859b3a48f668b2eb1f113e896cb851b) Thanks [@thdxr](https://github.com/thdxr)! - Fix issue with ws dependency preventing local server from starting

## 1.2.2

### Patch Changes

- [#1728](https://github.com/serverless-stack/sst/pull/1728) [`3229694c`](https://github.com/serverless-stack/sst/commit/3229694ceee9f18d008a621705d46c28e9ca2f35) Thanks [@thdxr](https://github.com/thdxr)! - Move graphql to peer dependencies by implementing weakImport. If you are using the AppSyncApi construct be sure to add `graphql` and `@graphql-tools/merge` to your dependencies.

## 1.2.1

### Patch Changes

- [`d90a1989`](https://github.com/serverless-stack/sst/commit/d90a1989411fa5d868778d2e686323ad08e33efb) Thanks [@thdxr](https://github.com/thdxr)! - Include graphql as a core dependency

## 1.2.0

### Minor Changes

- [#1710](https://github.com/serverless-stack/sst/pull/1710) [`e170ea3f`](https://github.com/serverless-stack/sst/commit/e170ea3fb586cbe36e11beb8f9d9af4f420c2d7e) Thanks [@thdxr](https://github.com/thdxr)! - Moved codebase to ESM. This should not have any impact on your codebase if you are not using ESM. If you are using ESM and you are using an esbuild plugin, be sure to rename your plugins file to have a .cjs extension

### Patch Changes

- [#1719](https://github.com/serverless-stack/sst/pull/1719) [`3610b5da`](https://github.com/serverless-stack/sst/commit/3610b5da4f57fd35f1fb824701b7bfc4e8ce1a83) Thanks [@fwang](https://github.com/fwang)! - Function: add support for dotnet (.NET 6) runtime

* [#1715](https://github.com/serverless-stack/sst/pull/1715) [`0bc69b52`](https://github.com/serverless-stack/sst/commit/0bc69b520f68dc5325b974386170d3db0d21416c) Thanks [@fwang](https://github.com/fwang)! - Load .env files for debug stack

## 1.1.2

### Patch Changes

- [`3927251b`](https://github.com/serverless-stack/sst/commit/3927251bbc834009ea19654f54a4e6c935ea90e9) Thanks [@thdxr](https://github.com/thdxr)! - Remove strict null checks for warning JS users

## 1.1.1

### Patch Changes

- [#1698](https://github.com/serverless-stack/sst/pull/1698) [`b81522a4`](https://github.com/serverless-stack/sst/commit/b81522a4dd0789292a4300b5465c4cab13f7a0cc) Thanks [@thdxr](https://github.com/thdxr)! - My test feature

## 1.1.0

### Minor Changes

- 5860eb64: Update CDK to 2.24.0

## 1.0.12

### Patch Changes

- 31ec3eb1: Added release snapshot script

## 1.0.11

### Patch Changes

- 78cb27fb: Removed unused dependency on dataloader
