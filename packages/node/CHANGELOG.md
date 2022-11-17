# @serverless-stack/node

## 1.18.2

## 1.18.1

### Patch Changes

- [`c61e96db7`](https://github.com/serverless-stack/sst/commit/c61e96db7cf898b53cd733f1834e1e2e3f2b6809) Thanks [@fwang](https://github.com/fwang)! - Auth client: fix initializing error when used in sst bind

## 1.18.0

### Patch Changes

- [#2187](https://github.com/serverless-stack/sst/pull/2187) [`8cbb8b72f`](https://github.com/serverless-stack/sst/commit/8cbb8b72fabc496bf7975c611b3d64223d67bd41) Thanks [@fwang](https://github.com/fwang)! - Api: add setCors function to configure CORS lazily

## 1.17.1

### Patch Changes

- [#2180](https://github.com/serverless-stack/sst/pull/2180) [`f3689cad0`](https://github.com/serverless-stack/sst/commit/f3689cad04d4c98bd78fd935d6bf641070c2deb7) Thanks [@fwang](https://github.com/fwang)! - Auth: support Facebook adapter

## 1.17.0

## 1.16.3

### Patch Changes

- [`37aa18ca8`](https://github.com/serverless-stack/sst/commit/37aa18ca8d938574cd4ae70ba299ec37259fcb45) Thanks [@fwang](https://github.com/fwang)! - config client: fix Config values returns objects when running in `sst bind`

## 1.16.2

## 1.16.1

### Patch Changes

- [#2172](https://github.com/serverless-stack/sst/pull/2172) [`aa1122646`](https://github.com/serverless-stack/sst/commit/aa1122646fa0e808a91d585513cb5cd6759ed2c1) Thanks [@fwang](https://github.com/fwang)! - Resource Binding: allow `sst bind` to bind resources that are not bound to functions

* [#2172](https://github.com/serverless-stack/sst/pull/2172) [`aa1122646`](https://github.com/serverless-stack/sst/commit/aa1122646fa0e808a91d585513cb5cd6759ed2c1) Thanks [@fwang](https://github.com/fwang)! - Resource Binding: support construct id in kebab case

- [#2172](https://github.com/serverless-stack/sst/pull/2172) [`aa1122646`](https://github.com/serverless-stack/sst/commit/aa1122646fa0e808a91d585513cb5cd6759ed2c1) Thanks [@fwang](https://github.com/fwang)! - Resource Binding: support custom SSM prefix

## 1.16.0

### Minor Changes

- [#2155](https://github.com/serverless-stack/sst/pull/2155) [`f2ce4f7b2`](https://github.com/serverless-stack/sst/commit/f2ce4f7b2f4d92686ef7d24ece0ae6fd44223898) Thanks [@fwang](https://github.com/fwang)! - Resource binding

## 1.15.16

## 1.15.15

## 1.15.14

## 1.15.13

## 1.15.12

## 1.15.11

## 1.15.10

## 1.15.9

## 1.15.8

## 1.15.7

## 1.15.6

## 1.15.5

## 1.15.4

## 1.15.3

## 1.15.2

## 1.15.1

## 1.15.0

### Minor Changes

- [#2028](https://github.com/serverless-stack/sst/pull/2028) [`86137b645`](https://github.com/serverless-stack/sst/commit/86137b645311473b8d51ec8ee3bdfb70656f3c58) Thanks [@fwang](https://github.com/fwang)! - Job: construct for long running jobs

## 1.14.4

## 1.14.3

## 1.14.2

## 1.14.1

## 1.14.0

## 1.13.0

## 1.12.4

## 1.12.3

### Patch Changes

- [`cacb73493`](https://github.com/serverless-stack/sst/commit/cacb73493295619538375ff9feb6ee559be1dfa3) Thanks [@thdxr](https://github.com/thdxr)! - Auto reset contexts when new lambda invocation detected

## 1.12.2

## 1.12.1

## 1.12.0

## 1.11.2

## 1.11.1

## 1.11.0

## 1.10.6

## 1.10.5

## 1.10.4

## 1.10.3

## 1.10.2

## 1.10.1

## 1.10.0

### Minor Changes

- [#1921](https://github.com/serverless-stack/sst/pull/1921) [`c628edfe1`](https://github.com/serverless-stack/sst/commit/c628edfe1034f0a6ee788ec41b052353a73c5438) Thanks [@thdxr](https://github.com/thdxr)! - SST Auth is available! Checkout docs here: https://sst.dev/auth

  Breaking Changes:

  - The old sst.Auth construct has been renamed to sst.Cognito. If you are using it be sure to update all references to sst.Cognito - no other changes should be needed.
  - The import for `createGQLHandler` has changed to `GraphQLHandler` to match `AuthHandler` and other handlers we will be shipping soon.

## 1.9.4

## 1.9.3

## 1.9.2

## 1.9.1

## 1.9.0

### Patch Changes

- [#1987](https://github.com/serverless-stack/sst/pull/1987) [`82cf416fb`](https://github.com/serverless-stack/sst/commit/82cf416fb3259501fbe8440c5a4c3c9cefa13e1a) Thanks [@fwang](https://github.com/fwang)! - Config: use aws sdk v3 in client library

## 1.8.4

## 1.8.3

## 1.8.2

## 1.8.1

## 1.8.0

### Minor Changes

- [#1957](https://github.com/serverless-stack/sst/pull/1957) [`989a4f516`](https://github.com/serverless-stack/sst/commit/989a4f516175c2e51a649acad4478d3eec5319f1) Thanks [@fwang](https://github.com/fwang)! - Release Config

## 1.7.0

## 1.6.10

## 1.6.9

## 1.6.8

## 1.6.7

## 1.6.6

## 1.6.5

## 1.6.4

## 1.6.3

## 1.6.2

## 1.6.1

## 1.6.0

## 1.5.2

## 1.5.1

## 1.5.0

## 1.4.1

## 1.4.0

## 1.3.0

## 1.2.36

## 1.2.35

## 1.2.34

## 1.2.33

## 1.2.32

## 1.2.31

## 1.2.30

## 1.2.29

## 1.2.28

## 1.2.27

## 1.2.26

## 1.2.25

## 1.2.24

## 1.2.23

## 1.2.22

## 1.2.21

## 1.2.20

## 1.2.19

## 1.2.18

## 1.2.17

## 1.2.16

## 1.2.15

## 1.2.14

## 1.2.13

## 1.2.12

## 1.2.11

## 1.2.10

## 1.2.9

## 1.2.8

## 1.2.7

## 1.2.6

## 1.2.5

## 1.2.4

## 1.2.3

## 1.2.2

## 1.2.1

## 1.2.0

## 1.1.2

## 1.1.1

## 1.1.0

### Minor Changes

- 5860eb64: Update CDK to 2.24.0

## 1.0.12

### Patch Changes

- 31ec3eb1: Added release snapshot script

## 1.0.11
