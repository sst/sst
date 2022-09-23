# @serverless-stack/docs

## 1.8.1

### Patch Changes

- [`d25d5887d`](https://github.com/serverless-stack/sst/commit/d25d5887d241d03405784b224678e3f5395d53a7) Thanks [@thdxr](https://github.com/thdxr)! - Support postgres11.13

  If you have an existing postgres10.14 cluster, you should be able to upgrade simplying by updating your stacks code to `engine: postgres11.13`

## 1.8.0

### Minor Changes

- [#2028](https://github.com/serverless-stack/sst/pull/2028) [`86137b645`](https://github.com/serverless-stack/sst/commit/86137b645311473b8d51ec8ee3bdfb70656f3c58) Thanks [@fwang](https://github.com/fwang)! - Job: construct for long running jobs

## 1.7.2

### Patch Changes

- [#2076](https://github.com/serverless-stack/sst/pull/2076) [`a7e201566`](https://github.com/serverless-stack/sst/commit/a7e201566779dcc3d1fcf1f52389ba73708f9367) Thanks [@fwang](https://github.com/fwang)! - Bucket: support notifications on imported S3 Buckets

## 1.7.1

### Patch Changes

- [#2063](https://github.com/serverless-stack/sst/pull/2063) [`873ecf3b6`](https://github.com/serverless-stack/sst/commit/873ecf3b622cfe8843f2eb40c5069a97966e7936) Thanks [@jayair](https://github.com/jayair)! - Updating to RDS and DynamoDB starter to Kysely codegen

## 1.7.0

### Minor Changes

- [`c8b6b68f4`](https://github.com/serverless-stack/sst/commit/c8b6b68f49012f9e0e8949b0c2146d9f78aa7f05) Thanks [@jayair](https://github.com/jayair)! - Updating `create sst` GraphQL template with new tutorial app.

## 1.6.2

### Patch Changes

- [#2016](https://github.com/serverless-stack/sst/pull/2016) [`190fa9306`](https://github.com/serverless-stack/sst/commit/190fa930610a1ad63684a53ed28bef458c7c923c) Thanks [@fwang](https://github.com/fwang)! - Table: support event filtering for stream consumer

## 1.6.1

### Patch Changes

- [#1971](https://github.com/serverless-stack/sst/pull/1971) [`d7ac80470`](https://github.com/serverless-stack/sst/commit/d7ac8047062f859d4a8e8c10900e7388ba7b4b1a) Thanks [@fwang](https://github.com/fwang)! - Cli: add bootstrap command with the ability to tag

## 1.6.0

### Minor Changes

- [#1957](https://github.com/serverless-stack/sst/pull/1957) [`989a4f516`](https://github.com/serverless-stack/sst/commit/989a4f516175c2e51a649acad4478d3eec5319f1) Thanks [@fwang](https://github.com/fwang)! - Release Config

## 1.5.0

### Minor Changes

- [#1922](https://github.com/serverless-stack/sst/pull/1922) [`e0a5eba96`](https://github.com/serverless-stack/sst/commit/e0a5eba964a9fc2d413a132333d388a40a81faa9) Thanks [@fwang](https://github.com/fwang)! - Function: support Java runtime built with gradle

## 1.4.2

### Patch Changes

- [#1940](https://github.com/serverless-stack/sst/pull/1940) [`91d28a7d3`](https://github.com/serverless-stack/sst/commit/91d28a7d37e1a9c960c18ee419c19bf4d59da050) Thanks [@fwang](https://github.com/fwang)! - Api: support Lambda container routes

## 1.4.1

### Patch Changes

- [#1932](https://github.com/serverless-stack/sst/pull/1932) [`bad52a000`](https://github.com/serverless-stack/sst/commit/bad52a000fe0a0aee135ef8207fa726a564a54de) Thanks [@fwang](https://github.com/fwang)! - StaticSite: support importing existing S3 bucket

## 1.4.0

### Minor Changes

- [#1898](https://github.com/serverless-stack/sst/pull/1898) [`4bfd5915c`](https://github.com/serverless-stack/sst/commit/4bfd5915c97f7996d85f7a5cad3f273d836b60fe) Thanks [@fwang](https://github.com/fwang)! - RDS: support importing existing Aurora Serverless v1 cluster

## 1.3.0

### Minor Changes

- [#1800](https://github.com/serverless-stack/sst/pull/1800) [`30ca1ca82`](https://github.com/serverless-stack/sst/commit/30ca1ca8237ad666214e9d4e73a7e24f7cd094c8) Thanks [@ctrlplusb](https://github.com/ctrlplusb)! - Add RemixSite construct

## 1.2.0

### Minor Changes

- [#1871](https://github.com/serverless-stack/sst/pull/1871) [`d3c30eb5b`](https://github.com/serverless-stack/sst/commit/d3c30eb5b906ab9790e4e9b97c8a84c4c4bcd9b4) Thanks [@fwang](https://github.com/fwang)! - Auth: make "attachPermissionsToAuthUsers" take scope to control stack dependencies when referening resources from another stack

## 1.1.9

### Patch Changes

- [`cf0f81a77`](https://github.com/serverless-stack/sst/commit/cf0f81a778bf17d118ea4ca9e3996fdde420ed66) Thanks [@thdxr](https://github.com/thdxr)! - Flip create-sst to default to new stack

## 1.1.8

### Patch Changes

- [#1814](https://github.com/serverless-stack/sst/pull/1814) [`33b89b64`](https://github.com/serverless-stack/sst/commit/33b89b64af3a9cec98dea0f3c5fcc7279a8142b0) Thanks [@fwang](https://github.com/fwang)! - DebugStack: allow customizing DynamoDB Table

## 1.1.7

### Patch Changes

- [#1811](https://github.com/serverless-stack/sst/pull/1811) [`fb7d3b02`](https://github.com/serverless-stack/sst/commit/fb7d3b02a9026b31e42167473d7d3eba21a63f7a) Thanks [@fwang](https://github.com/fwang)! - Function: lift function url to top level prop

## 1.1.6

### Patch Changes

- [#1802](https://github.com/serverless-stack/sst/pull/1802) [`d8ad13fd`](https://github.com/serverless-stack/sst/commit/d8ad13fd412ea3457a05524d4692cb914773bb36) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: update runtime to Node.js 16

* [#1802](https://github.com/serverless-stack/sst/pull/1802) [`d8ad13fd`](https://github.com/serverless-stack/sst/commit/d8ad13fd412ea3457a05524d4692cb914773bb36) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: allow overriding Lambda@Edge runtime

## 1.1.5

### Patch Changes

- [#1783](https://github.com/serverless-stack/sst/pull/1783) [`06666f06`](https://github.com/serverless-stack/sst/commit/06666f061e806592eb65159c422361926e8d098f) Thanks [@fwang](https://github.com/fwang)! - EventBus: support lambda.Function targets

## 1.1.4

### Patch Changes

- [#1766](https://github.com/serverless-stack/sst/pull/1766) [`a8f56ae8`](https://github.com/serverless-stack/sst/commit/a8f56ae888d3860e126ed88ea539389985b5da9e) Thanks [@fwang](https://github.com/fwang)! - sst remove: add --debug-stack option to remove debug stack

## 1.1.3

### Patch Changes

- [#1744](https://github.com/serverless-stack/sst/pull/1744) [`6c94940d`](https://github.com/serverless-stack/sst/commit/6c94940d2548426f32503dea338d891f02d6676a) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support reusing CloudFront Origin Request Policy

## 1.1.2

### Patch Changes

- [#1709](https://github.com/serverless-stack/sst/pull/1709) [`cd476c4b`](https://github.com/serverless-stack/sst/commit/cd476c4b840477386bfa0a9edecd34f54cbaaf51) Thanks [@andreacavagna01](https://github.com/andreacavagna01)! - Update Leapp screenshot in IAM credentials doc

## 1.1.1

### Patch Changes

- [#1719](https://github.com/serverless-stack/sst/pull/1719) [`3610b5da`](https://github.com/serverless-stack/sst/commit/3610b5da4f57fd35f1fb824701b7bfc4e8ce1a83) Thanks [@fwang](https://github.com/fwang)! - Function: add support for dotnet (.NET 6) runtime

* [#1716](https://github.com/serverless-stack/sst/pull/1716) [`480ce263`](https://github.com/serverless-stack/sst/commit/480ce26378962d3ced737624dad4734cd7ad2b53) Thanks [@fwang](https://github.com/fwang)! - Cron: support disabling cron job

## 1.1.0

### Minor Changes

- 5860eb64: Update CDK to 2.24.0

## 1.0.10

### Patch Changes

- 31ec3eb1: Added release snapshot script
