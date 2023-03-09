# @serverless-stack/cli2

## 2.1.20

### Patch Changes

- [`7d7f20ae3`](https://github.com/serverless-stack/sst/commit/7d7f20ae3afb1093831769484452f5d41d411049) Thanks [@thdxr](https://github.com/thdxr)! - Fix issue where stdout messages were appearing under wrong request

## 2.1.19

### Patch Changes

- [`e5e2042f5`](https://github.com/serverless-stack/sst/commit/e5e2042f5bd648698b11078a56e54156c289852a) Thanks [@thdxr](https://github.com/thdxr)! - Fix for copyFiles breaking under sst dev when in nested folders

## 2.1.18

### Patch Changes

- [`3162e210c`](https://github.com/serverless-stack/sst/commit/3162e210c2d6a48837a6e77d39a04a9f4c9a143c) Thanks [@fwang](https://github.com/fwang)! - Stack: remove non-alphanumeric characters in stack output name

- [`f75000236`](https://github.com/serverless-stack/sst/commit/f75000236d83a7034e1b849e5cdc269415fa8d2a) Thanks [@fwang](https://github.com/fwang)! - [WIP] SsrSite: support resource binding in SSR functions

- [`ab3fdcef9`](https://github.com/serverless-stack/sst/commit/ab3fdcef9816a23d99c90791668a7b03dbacdb3b) Thanks [@thdxr](https://github.com/thdxr)! - Implement nodejs runtime using native http instead of undici

- [#2622](https://github.com/serverless-stack/sst/pull/2622) [`fdf922366`](https://github.com/serverless-stack/sst/commit/fdf92236620be4ba33fd7db990b2edc7a601e11b) Thanks [@z0d14c](https://github.com/z0d14c)! - bug: remove shell parameter when spawning sub-processes

## 2.1.17

### Patch Changes

- [#2590](https://github.com/serverless-stack/sst/pull/2590) [`1df37b1dc`](https://github.com/serverless-stack/sst/commit/1df37b1dc7707dbecf7e92d5b1fc7463eb725eae) Thanks [@thdxr](https://github.com/thdxr)! - Release next version of auth under `future` namespace for people who want to try it out early

## 2.1.16

### Patch Changes

- [`a9bd02b15`](https://github.com/serverless-stack/sst/commit/a9bd02b1513b7b8a42579fcff606a40e8a582151) Thanks [@thdxr](https://github.com/thdxr)! - Fix go builds failing without printing error

## 2.1.15

### Patch Changes

- [`8c6f70b3d`](https://github.com/serverless-stack/sst/commit/8c6f70b3dfe1b7b1351533f052397ea6b7f1c22c) Thanks [@fwang](https://github.com/fwang)! - Stack: allow stack outputs with same ids as construct

- [`a061a0d1f`](https://github.com/serverless-stack/sst/commit/a061a0d1f8df6cb9594d3bd37bd5ad314e044149) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: add --public-access-block-configuration option

- [`b44f579d4`](https://github.com/serverless-stack/sst/commit/b44f579d4f03ed08bf24e2de58310e74a357a1ae) Thanks [@fwang](https://github.com/fwang)! - WebSocketApi: grant execute-api:ManageConnections permissions on bind

## 2.1.14

### Patch Changes

- [#2616](https://github.com/serverless-stack/sst/pull/2616) [`ac124bc7e`](https://github.com/serverless-stack/sst/commit/ac124bc7ead276c1e7b351ebd70b3c57ff84e751) Thanks [@iloewensen](https://github.com/iloewensen)! - RDS: use AWS SDK v3 in migration script

## 2.1.13

### Patch Changes

- [`549b1628a`](https://github.com/serverless-stack/sst/commit/549b1628ae9eafc20a9d653bc58afc2330e9955a) Thanks [@thdxr](https://github.com/thdxr)! - Please upgrade to this version if possible, this contains an that prevents potentially run-away SQS retries under certain configurations when sst dev is not running.

- [#2609](https://github.com/serverless-stack/sst/pull/2609) [`7cfcc2160`](https://github.com/serverless-stack/sst/commit/7cfcc21602bfbffe02e8597d570e7dcb0015fce0) Thanks [@justindra](https://github.com/justindra)! - `sst update` now also updates the version of `astro-sst`

## 2.1.12

### Patch Changes

- [`37c0f4fed`](https://github.com/serverless-stack/sst/commit/37c0f4fed4c1468d78f70d9e26adab833aca1b02) Thanks [@fwang](https://github.com/fwang)! - sst dev/deploy: do not display "The following resource(s) failed" message

- [`225e2706b`](https://github.com/serverless-stack/sst/commit/225e2706b48fb1a73b55976e0a50bfadde22b7f6) Thanks [@fwang](https://github.com/fwang)! - Script: fail deployment if script fails to run

## 2.1.11

### Patch Changes

- [`7fcf20b42`](https://github.com/serverless-stack/sst/commit/7fcf20b42c787472e9c7fa2f6a192d0df165c633) Thanks [@fwang](https://github.com/fwang)! - Secrets: ignore function not found when metadata is out of sync

- [`b5b75aa2a`](https://github.com/serverless-stack/sst/commit/b5b75aa2a705fa6fbce4c9ef1cc05f199135f305) Thanks [@thdxr](https://github.com/thdxr)! - Handle exceptional esbuild error

## 2.1.10

### Patch Changes

- [`d2e7d097d`](https://github.com/serverless-stack/sst/commit/d2e7d097d186c68c5ebde1bdd1c56a9de4f31787) Thanks [@fwang](https://github.com/fwang)! - SsrSite: set "x-forwarded-host" using CloudFront function

- [#2584](https://github.com/serverless-stack/sst/pull/2584) [`f08ddd819`](https://github.com/serverless-stack/sst/commit/f08ddd819b36749f2e584639b9ab52b0c348e2ba) Thanks [@mattlootlabs](https://github.com/mattlootlabs)! - Use posix seperator when deploying python lambda

- [`4aefd10f6`](https://github.com/serverless-stack/sst/commit/4aefd10f6ddf8528b66a11ea48ce4d5972845623) Thanks [@fwang](https://github.com/fwang)! - Job: add esbuild options

## 2.1.9

### Patch Changes

- [#2602](https://github.com/serverless-stack/sst/pull/2602) [`e84d5c846`](https://github.com/serverless-stack/sst/commit/e84d5c84621e515d177819f6fb7144f2c24a661e) Thanks [@fwang](https://github.com/fwang)! - Api: fix access log field "cognitoIdentityId" not supported in us-west-2

## 2.1.8

### Patch Changes

- [#2599](https://github.com/serverless-stack/sst/pull/2599) [`4e7449b1f`](https://github.com/serverless-stack/sst/commit/4e7449b1f7efe9b22e6d63fbed5682a518e86c47) Thanks [@zackheil](https://github.com/zackheil)! - Removes `aws-crt` dependency to fix macOS crashes

## 2.1.7

### Patch Changes

- [`56c73fe8c`](https://github.com/serverless-stack/sst/commit/56c73fe8cd45ef3b85a0aa743b1fa78f613057b7) Thanks [@thdxr](https://github.com/thdxr)! - IOT performance upgrades

## 2.1.6

### Patch Changes

- [#2571](https://github.com/serverless-stack/sst/pull/2571) [`5d04dbcf8`](https://github.com/serverless-stack/sst/commit/5d04dbcf8b72cbeb841dfc858e38a1782916d67b) Thanks [@GinIsTheAnswer](https://github.com/GinIsTheAnswer)! - Ensure that output of path.relative uses posix separator

## 2.1.5

### Patch Changes

- [`746701795`](https://github.com/serverless-stack/sst/commit/746701795a62ee156944cc75528f1764d25487ad) Thanks [@thdxr](https://github.com/thdxr)! - Fix aws-sdk warning message

## 2.1.4

### Patch Changes

- [`3198bd91e`](https://github.com/serverless-stack/sst/commit/3198bd91ee8d7dc9e354a05b6bf63fc8b9dd481f) Thanks [@thdxr](https://github.com/thdxr)! - Upgrade to kysely data api v3

## 2.1.3

### Patch Changes

- [`42b49dd35`](https://github.com/serverless-stack/sst/commit/42b49dd351601152bd046b7d35f1586304d51ff7) Thanks [@fwang](https://github.com/fwang)! - RemixSite: fix nodejs18.x runtime error

## 2.1.2

### Patch Changes

- [#2566](https://github.com/serverless-stack/sst/pull/2566) [`2413cced5`](https://github.com/serverless-stack/sst/commit/2413cced523f35c330173aae1ecd2b5c8b79ce2d) Thanks [@afrackspace](https://github.com/afrackspace)! - Improve Python bundling speed

## 2.1.1

### Patch Changes

- [#2562](https://github.com/serverless-stack/sst/pull/2562) [`59f524e19`](https://github.com/serverless-stack/sst/commit/59f524e1904c3316c6883a331e8868a6032835af) Thanks [@georgeevans1995](https://github.com/georgeevans1995)! - Update KyselyTypeGenerator to use the correct dialect based on db engine

## 2.1.0

### Minor Changes

- [`3e3a4e440`](https://github.com/serverless-stack/sst/commit/3e3a4e440a8510eeb57cd83debcf8c759ccc533a) Thanks [@fwang](https://github.com/fwang)! - Drop support for Node.js 14

### Patch Changes

- [`79f744c79`](https://github.com/serverless-stack/sst/commit/79f744c79058c35f7b44f63fad7bdd088208b9c8) Thanks [@fwang](https://github.com/fwang)! - StaticSite/SsrSite: return undefined instead of throw when accessing site.cdk

- [#2564](https://github.com/serverless-stack/sst/pull/2564) [`608883ad5`](https://github.com/serverless-stack/sst/commit/608883ad5ff0931f4af68f8c941eaa9f3e463b35) Thanks [@fwang](https://github.com/fwang)! - StaticSite: append index.html to urls with trailing slash

## 2.0.39

### Patch Changes

- [`0f104cf36`](https://github.com/serverless-stack/sst/commit/0f104cf36ddb625ea3043480460f12400928a636) Thanks [@thdxr](https://github.com/thdxr)! - Fix CLI crash when kysely codegen fails

## 2.0.38

### Patch Changes

- [`8882f47ba`](https://github.com/serverless-stack/sst/commit/8882f47bab552a2cbae0a858acd4051636a5d536) Thanks [@thdxr](https://github.com/thdxr)! - Update aws dependencies

- [`13eb42c04`](https://github.com/serverless-stack/sst/commit/13eb42c041aceca3b221ae3fa60be21eea86e11a) Thanks [@thdxr](https://github.com/thdxr)! - Use docker to bundle python function

## 2.0.37

### Patch Changes

- [`2c332911f`](https://github.com/serverless-stack/sst/commit/2c332911ffa2ee6d6d459ab2464dc21cd04c9405) Thanks [@thdxr](https://github.com/thdxr)! - Send empty cognito identity when it's not available

- [#2548](https://github.com/serverless-stack/sst/pull/2548) [`4f9aa499d`](https://github.com/serverless-stack/sst/commit/4f9aa499dfc27541340781bd10d874db2700c7ab) Thanks [@afrackspace](https://github.com/afrackspace)! - Fix dev mode in GovCloud (SSTv2)

## 2.0.36

### Patch Changes

- [`429aa6fee`](https://github.com/serverless-stack/sst/commit/429aa6fee3b306aa3c79e4b44424e02f35fc291a) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: do not create edge function when middleware is not used

- [`7491ca5b9`](https://github.com/serverless-stack/sst/commit/7491ca5b989babad3a37775ae9644aa208d1c1a4) Thanks [@thdxr](https://github.com/thdxr)! - Add \_\_dirname shim to default banner

## 2.0.35

### Patch Changes

- [`6e36d8e6a`](https://github.com/serverless-stack/sst/commit/6e36d8e6ad6ae1afe7dc149be42cc110b9d4603b) Thanks [@thdxr](https://github.com/thdxr)! - Do not recreate function path if absolute path

## 2.0.34

### Patch Changes

- [`d8e6ab9ed`](https://github.com/serverless-stack/sst/commit/d8e6ab9eda2394e0f9e1bc782a74371edf2531f4) Thanks [@thdxr](https://github.com/thdxr)! - Fix type errors with graphql preset

## 2.0.33

### Patch Changes

- [`cf23cea67`](https://github.com/serverless-stack/sst/commit/cf23cea678da7b9ee623ce76c8ab26a9259d5ac1) Thanks [@fwang](https://github.com/fwang)! - Function: do not allow setting securityGroups when vpc is not configured.

- [`531310c1c`](https://github.com/serverless-stack/sst/commit/531310c1cc2e9fd26d33b20eac07a953f7e70396) Thanks [@fwang](https://github.com/fwang)! - sst dev: fix IoT region not parsed correctly for GovCloud

## 2.0.32

### Patch Changes

- [`d3bab944b`](https://github.com/serverless-stack/sst/commit/d3bab944b4ec4b8c48f90d48754d9e9b03fa38fd) Thanks [@fwang](https://github.com/fwang)! - EventBus: support adding targets to existing rules.

## 2.0.31

### Patch Changes

- [`776fb8f26`](https://github.com/serverless-stack/sst/commit/776fb8f269ab20c574fb7e365bffbb88d30d4a60) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: use Node.js 16 runtime for gov cloud regions

## 2.0.30

### Patch Changes

- [`e6020cede`](https://github.com/serverless-stack/sst/commit/e6020cedeaec8007f9c205d3cd582dc60d7572a2) Thanks [@thdxr](https://github.com/thdxr)! - Install python dependencies from target directory

- [#2516](https://github.com/serverless-stack/sst/pull/2516) [`cedcd1dca`](https://github.com/serverless-stack/sst/commit/cedcd1dcaf83a951c37f906c0e64e4927c08a451) Thanks [@m4tty-d](https://github.com/m4tty-d)! - RDS: Fix migrator function handler path

## 2.0.29

### Patch Changes

- [#2519](https://github.com/serverless-stack/sst/pull/2519) [`91882698a`](https://github.com/serverless-stack/sst/commit/91882698ab20da8824106a16c72f8d7e7a0b3700) Thanks [@khuezy](https://github.com/khuezy)! - NextjsSite: fix image optimization lambda does not have s3 permission

## 2.0.28

### Patch Changes

- [`31c626c25`](https://github.com/serverless-stack/sst/commit/31c626c252c3f002e2875a7918cb295dc29febad) Thanks [@fwang](https://github.com/fwang)! - Sites: block public access on Bucket

## 2.0.27

### Patch Changes

- [#2495](https://github.com/serverless-stack/sst/pull/2495) [`61d65a5be`](https://github.com/serverless-stack/sst/commit/61d65a5be5e2ee1e14a43bddb3694b509f87846b) Thanks [@khuezy](https://github.com/khuezy)! - NextjsSite: allow rsc headers for in-place routing

## 2.0.26

### Patch Changes

- [`d40c4ccf5`](https://github.com/serverless-stack/sst/commit/d40c4ccf5f5ebc6b20651dc220759c060aaf1626) Thanks [@thdxr](https://github.com/thdxr)! - Send correct deadline to local lambda

- [#2508](https://github.com/serverless-stack/sst/pull/2508) [`d4e8c6f01`](https://github.com/serverless-stack/sst/commit/d4e8c6f01eee6413917e5d98c24667c6bc1a0c04) Thanks [@moochannel](https://github.com/moochannel)! - Project: Fix .env.<stage>.local is not loaded

## 2.0.25

### Patch Changes

- [#2501](https://github.com/serverless-stack/sst/pull/2501) [`8fd694a12`](https://github.com/serverless-stack/sst/commit/8fd694a12f92b8f80119c6fe4e4abaa50e98d0ad) Thanks [@uwilken](https://github.com/uwilken)! - fix: CLI hrows error, when committing MFA on Node18

- [`d0272abca`](https://github.com/serverless-stack/sst/commit/d0272abcabd7b0a0b364222538e4b602f67c12b4) Thanks [@thdxr](https://github.com/thdxr)! - Fixed nodejs loader options not respect

## 2.0.24

### Patch Changes

- [`85da2991a`](https://github.com/serverless-stack/sst/commit/85da2991a2ad7034ffd00bd0e668916370989d18) Thanks [@thdxr](https://github.com/thdxr)! - Drop deprecated go runtime and support arm64 builds

- [`b6d28622b`](https://github.com/serverless-stack/sst/commit/b6d28622b8a9ce0440fee62bc0e0b3e35c054806) Thanks [@thdxr](https://github.com/thdxr)! - Support pipfile and poetry.lock

- [`6db19f16c`](https://github.com/serverless-stack/sst/commit/6db19f16cdff0f6787408f334db73a542ce33ac1) Thanks [@thdxr](https://github.com/thdxr)! - Ignore telemetry errors

## 2.0.23

### Patch Changes

- [`b25e6719a`](https://github.com/serverless-stack/sst/commit/b25e6719a0f6a005f0109c96a9792ccd438f9919) Thanks [@thdxr](https://github.com/thdxr)! - Fix stack file changes not detected on windows

## 2.0.22

### Patch Changes

- [`1302913cf`](https://github.com/serverless-stack/sst/commit/1302913cfc82e7a23dae1712149345883b8305b9) Thanks [@fwang](https://github.com/fwang)! - sst env: handle sites without environment

## 2.0.21

### Patch Changes

- [`761284c9e`](https://github.com/serverless-stack/sst/commit/761284c9ef388ac987f155bd62e3712e190629ea) Thanks [@thdxr](https://github.com/thdxr)! - Remove rogue log

- [`53f9625fa`](https://github.com/serverless-stack/sst/commit/53f9625faade446f42ec67f5010d1ce648bbb88d) Thanks [@thdxr](https://github.com/thdxr)! - Retry failed fetch calls

## 2.0.20

### Patch Changes

- [`7e2fd9e40`](https://github.com/serverless-stack/sst/commit/7e2fd9e406b4c21e55afea1089ff3b4a51d92f3b) Thanks [@thdxr](https://github.com/thdxr)! - Throw error when trying to deploy 0 stacks

## 2.0.19

### Patch Changes

- [#2481](https://github.com/serverless-stack/sst/pull/2481) [`f117acce5`](https://github.com/serverless-stack/sst/commit/f117acce5f547a8aa8662edb590a4483a2cd0911) Thanks [@fwang](https://github.com/fwang)! - WebSocketApi: create CloudWatch role automatically

## 2.0.18

### Patch Changes

- [#2478](https://github.com/serverless-stack/sst/pull/2478) [`301ca13ce`](https://github.com/serverless-stack/sst/commit/301ca13ce6d60dfda27f82b06cee049d65fbdec6) Thanks [@fwang](https://github.com/fwang)! - Fix `stream/consumer` not available in Node.js 14

## 2.0.17

### Patch Changes

- [#2470](https://github.com/serverless-stack/sst/pull/2470) [`2b78ba0bd`](https://github.com/serverless-stack/sst/commit/2b78ba0bd862de21b001e5a50a23fba2e1273dd4) Thanks [@ecumene](https://github.com/ecumene)! - Python Runtime: Don't copy SST directory

- [`36e22c436`](https://github.com/serverless-stack/sst/commit/36e22c43649105bd355e551433d65c8b510fecad) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: retry uploading metadata for up to 2 minutes

## 2.0.16

### Patch Changes

- [`cc41c0447`](https://github.com/serverless-stack/sst/commit/cc41c04477033fa572dae07798077b276bc0dd4d) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix circular dependency on deploy

## 2.0.15

### Patch Changes

- [#2463](https://github.com/serverless-stack/sst/pull/2463) [`d22ced926`](https://github.com/serverless-stack/sst/commit/d22ced926179433421e0103b7e2bbe158d176c88) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix circular dependency on deploy

## 2.0.14

### Patch Changes

- [#2459](https://github.com/serverless-stack/sst/pull/2459) [`5bd397611`](https://github.com/serverless-stack/sst/commit/5bd3976117cd2311193202bb57d767a9afa10d92) Thanks [@fwang](https://github.com/fwang)! - StaticSite/SsrSite: fix CF invalidation failed

## 2.0.13

### Patch Changes

- [`69f491f0a`](https://github.com/serverless-stack/sst/commit/69f491f0a8276e6ae6708f667d37beb4293a2d67) Thanks [@fwang](https://github.com/fwang)! - Job: fix createRequire banner added twice

- [#2457](https://github.com/serverless-stack/sst/pull/2457) [`bb1e79e42`](https://github.com/serverless-stack/sst/commit/bb1e79e42d621ac6b61d3b6f3fd5557aaf255be4) Thanks [@RichiCoder1](https://github.com/RichiCoder1)! - fix: send tags with deployment call

## 2.0.12

### Patch Changes

- [`119667da1`](https://github.com/serverless-stack/sst/commit/119667da1204720bbb8a59163bfea693d911ebf3) Thanks [@thdxr](https://github.com/thdxr)! - Fix sst deploy and remove filter

## 2.0.11

### Patch Changes

- [`f224eb94d`](https://github.com/serverless-stack/sst/commit/f224eb94d044541c5457a6a2a42f43e2fb93ecc3) Thanks [@fwang](https://github.com/fwang)! - Job: fix invoker not respecting live flag

## 2.0.10

### Patch Changes

- [`7b2debf10`](https://github.com/serverless-stack/sst/commit/7b2debf108cde084ed155d8576d226a911789aeb) Thanks [@thdxr](https://github.com/thdxr)! - Allow setting tags on bootstrap stack

## 2.0.9

### Patch Changes

- [`e987ab02c`](https://github.com/serverless-stack/sst/commit/e987ab02c33de45cf20d3e1beb92f38c9472b841) Thanks [@thdxr](https://github.com/thdxr)! - fix logical id mapping when metadata isn't available

## 2.0.8

### Patch Changes

- [#2452](https://github.com/serverless-stack/sst/pull/2452) [`778bb1b56`](https://github.com/serverless-stack/sst/commit/778bb1b56a915dff962f8040107e137a19917e2d) Thanks [@daniel-gato](https://github.com/daniel-gato)! - Fix kysely camelCase not being respected

- [`8ea1f9501`](https://github.com/serverless-stack/sst/commit/8ea1f950165f26239d4df7e0702505499e24076c) Thanks [@thdxr](https://github.com/thdxr)! - Support python install commands

## 2.0.7

### Patch Changes

- [`d83ab3c7c`](https://github.com/serverless-stack/sst/commit/d83ab3c7cd00a42008602ecac10e5f798d73e544) Thanks [@thdxr](https://github.com/thdxr)! - Nicer error messages when function handler is not found

## 2.0.6

### Patch Changes

- [`9b2683c99`](https://github.com/serverless-stack/sst/commit/9b2683c997b521c2ec2d5e9bfae4134fc7de2a90) Thanks [@fwang](https://github.com/fwang)! - RDS: fix permission error when secrets imported by partial arn

## 2.0.5

### Patch Changes

- [#2445](https://github.com/serverless-stack/sst/pull/2445) [`d7d18fa31`](https://github.com/serverless-stack/sst/commit/d7d18fa318d696b7e1873079d88afa30e9f9fecb) Thanks [@fwang](https://github.com/fwang)! - Api: support NLB route type

## 2.0.4

### Patch Changes

- [#2443](https://github.com/serverless-stack/sst/pull/2443) [`a9255af7c`](https://github.com/serverless-stack/sst/commit/a9255af7cbbf995698590b212fd51dad9aaff7ef) Thanks [@ecumene](https://github.com/ecumene)! - Fixed hardcoded python `services` directory

- [#2434](https://github.com/serverless-stack/sst/pull/2434) [`8b156ce53`](https://github.com/serverless-stack/sst/commit/8b156ce535d1d162fe3163bbfaab3536f1d701d4) Thanks [@mathisobadia](https://github.com/mathisobadia)! - Handle alternate domain names for SsrSite construct

## 2.0.3

### Patch Changes

- [`332c5e06d`](https://github.com/serverless-stack/sst/commit/332c5e06d9f187725b6ab5235ae479bde22e3b6c) Thanks [@thdxr](https://github.com/thdxr)! - Remove quote requirement for bind and env commands. Be sure to update your `sst env` and `sst bind` commands to remove the `'`

## 2.0.2

### Patch Changes

- [`ab5eacd82`](https://github.com/serverless-stack/sst/commit/ab5eacd8285fe158b7d30548425811b40d0c1e19) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: handle outdated CDK bootstrap version

- [#2436](https://github.com/serverless-stack/sst/pull/2436) [`8ece14072`](https://github.com/serverless-stack/sst/commit/8ece140729f1788b41ebea5095fb2ee8782dcd2e) Thanks [@fwang](https://github.com/fwang)! - Cognito: handle multiple userPoolIds for authorizer

- [`5f97e0bb1`](https://github.com/serverless-stack/sst/commit/5f97e0bb143272f7c1b9f0a166a09339aebb9091) Thanks [@fwang](https://github.com/fwang)! - SsrSite: handle alternate domains

- [`63de6a941`](https://github.com/serverless-stack/sst/commit/63de6a941d4f6262c18dcd892ab2ec4ce921e36c) Thanks [@fwang](https://github.com/fwang)! - sst env: pass AWS credentials to the script

- [#2437](https://github.com/serverless-stack/sst/pull/2437) [`5b4b61c23`](https://github.com/serverless-stack/sst/commit/5b4b61c23d7df9df553ac7e39cf0d6ae2cc08e2b) Thanks [@fwang](https://github.com/fwang)! - SsrSite: support runtime

## 2.0.1

### Patch Changes

- [`4268dbeaa`](https://github.com/serverless-stack/sst/commit/4268dbeaa998a7ef65d6e5bfaed5bab587a3ddb7) Thanks [@thdxr](https://github.com/thdxr)! - Remove references to rc in create-sst templates

## 2.0.0

### Major Changes

- [#2428](https://github.com/serverless-stack/sst/pull/2428) [`ce13bea66`](https://github.com/serverless-stack/sst/commit/ce13bea665ce80cfc5fb4a5b87e076e2f00ffece) Thanks [@thdxr](https://github.com/thdxr)! - SST 2.0

  This is a major overhaul of the SST codebase primarily for ergonomics and performance. There should be no infrastructure changes however there are some project structure and package changes. Please view the upgrade guide here: https://docs.sst.dev/upgrade-guide

## 2.0.0-rc.71

## 2.0.0-rc.70

### Patch Changes

- [#2424](https://github.com/serverless-stack/sst/pull/2424) [`21b3a9f81`](https://github.com/serverless-stack/sst/commit/21b3a9f8103c25fe691d450c5c9ef97ef481a716) Thanks [@github-actions](https://github.com/apps/github-actions)! - Lazy load bootstrap

## 2.0.0-rc.69

## 2.0.0-rc.68

### Patch Changes

- [`36ba7ab1b`](https://github.com/serverless-stack/sst/commit/36ba7ab1b290090c2ea4b926e0fc047de34076f6) Thanks [@thdxr](https://github.com/thdxr)! - Fix UI for stack errors

- [#2420](https://github.com/serverless-stack/sst/pull/2420) [`22712ce5b`](https://github.com/serverless-stack/sst/commit/22712ce5b5c5a1edc4a3def0eb3575f58f0b1c3d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix printing false

## 2.0.0-rc.67

### Patch Changes

- [#2419](https://github.com/serverless-stack/sst/pull/2419) [`45cef3d65`](https://github.com/serverless-stack/sst/commit/45cef3d651138a602147841ee41f095e76a59481) Thanks [@github-actions](https://github.com/apps/github-actions)! - Rework examples for sst2

## 2.0.0-rc.66

### Major Changes

- [#2413](https://github.com/serverless-stack/sst/pull/2413) [`0997f02fe`](https://github.com/serverless-stack/sst/commit/0997f02fef9aa2dc5fde03c1872a967b1758fc40) Thanks [@mvanleest](https://github.com/mvanleest)! - Fix: Auth routes unauthorized with default authorizer

## 2.0.0-rc.65

### Patch Changes

- [`54a811a32`](https://github.com/serverless-stack/sst/commit/54a811a3242e1a327b031c1cbe286e0bf328c434) Thanks [@thdxr](https://github.com/thdxr)! - Fix incorrect eventbus metadata

## 2.0.0-rc.64

### Patch Changes

- [`9994ddcb8`](https://github.com/serverless-stack/sst/commit/9994ddcb83fd21f6ae25c8aff331072921ad7726) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: fix middleware function timeout

## 2.0.0-rc.63

### Patch Changes

- [#2405](https://github.com/serverless-stack/sst/pull/2405) [`b69121bef`](https://github.com/serverless-stack/sst/commit/b69121befa514e85f1ccf88aa4b50a837ab11062) Thanks [@github-actions](https://github.com/apps/github-actions)! - SsrSite: allow overriding architecture

- [`efe53b587`](https://github.com/serverless-stack/sst/commit/efe53b5878f98fdca9292605353e039712eb8c84) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: fix middleware Lambda memory issue

## 2.0.0-rc.62

### Patch Changes

- [`7ef60acf8`](https://github.com/serverless-stack/sst/commit/7ef60acf866584b1a0426c4b03499133921b872c) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: set server function architecture to arm64

## 2.0.0-rc.61

### Patch Changes

- [`84231a25a`](https://github.com/serverless-stack/sst/commit/84231a25aabec326fc88b90b9e249ac043aa3d22) Thanks [@fwang](https://github.com/fwang)! - Fix rc release

## 2.0.0-rc.60

### Patch Changes

- [`c25d0982a`](https://github.com/serverless-stack/sst/commit/c25d0982a32decf8a09fc838b221bc4609e71ad0) Thanks [@fwang](https://github.com/fwang)! - SsrSite: allow overriding all vpc related props

## 2.0.0-rc.59

### Patch Changes

- [`293df5ff3`](https://github.com/serverless-stack/sst/commit/293df5ff373b2c22aaf72f0d0bc4d8bce823df2b) Thanks [@fwang](https://github.com/fwang)! - SsrSite: support vpc

## 2.0.0-rc.58

### Patch Changes

- [#2400](https://github.com/serverless-stack/sst/pull/2400) [`14fb6eaba`](https://github.com/serverless-stack/sst/commit/14fb6eabada703760be115e5f3566a0b5a8d7528) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix binding sites to function causes import sst/node to fail

## 2.0.0-rc.57

### Patch Changes

- [`204f42b10`](https://github.com/serverless-stack/sst/commit/204f42b100d157aafc1466ddcbf3640c6c358316) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix environment not replaced

- [#2396](https://github.com/serverless-stack/sst/pull/2396) [`da3d0740f`](https://github.com/serverless-stack/sst/commit/da3d0740f56c53872ba2321f8c8b312ca8b68bf4) Thanks [@github-actions](https://github.com/apps/github-actions)! - Update CDK to 2.62.2

## 2.0.0-rc.56

### Patch Changes

- [#2388](https://github.com/serverless-stack/sst/pull/2388) [`64317dda5`](https://github.com/serverless-stack/sst/commit/64317dda561dfb1f327897da8805d84f19df499c) Thanks [@andykenward](https://github.com/andykenward)! - bug: sst plugin pothos throwing error when no commands array

- [`e823810bc`](https://github.com/serverless-stack/sst/commit/e823810bc79fb48f05d5d3b943e40f7817d773d2) Thanks [@thdxr](https://github.com/thdxr)! - Restore static site changes

## 2.0.0-rc.55

### Patch Changes

- [`8e5fe68f8`](https://github.com/serverless-stack/sst/commit/8e5fe68f879cf1b4598c0bf23791439b6a9b0432) Thanks [@thdxr](https://github.com/thdxr)! - Fix for create-sst touching .git folder

## 2.0.0-rc.54

### Patch Changes

- [#2383](https://github.com/serverless-stack/sst/pull/2383) [`b74740f38`](https://github.com/serverless-stack/sst/commit/b74740f38409a7375855da589471f2884ed2a379) Thanks [@github-actions](https://github.com/apps/github-actions)! - Show warning when switching between dev/deploy

## 2.0.0-rc.53

### Patch Changes

- [`d2a695fe7`](https://github.com/serverless-stack/sst/commit/d2a695fe7edc4103aa662021837522863418c1e7) Thanks [@thdxr](https://github.com/thdxr)! - Fix site env

## 2.0.0-rc.52

### Patch Changes

- [#2378](https://github.com/serverless-stack/sst/pull/2378) [`ba1efbe39`](https://github.com/serverless-stack/sst/commit/ba1efbe39c0325222a02853e705ae9d12c29ea43) Thanks [@github-actions](https://github.com/apps/github-actions)! - Support MFA

- [`9bb8a2ffb`](https://github.com/serverless-stack/sst/commit/9bb8a2ffbea97ba5f372ac71086be6e88e0822b1) Thanks [@fwang](https://github.com/fwang)! - sst dev: do not deploy placeholder sites

## 2.0.0-rc.51

### Patch Changes

- [`523e5f9fa`](https://github.com/serverless-stack/sst/commit/523e5f9faa10cc4b8509409d08b4991a5cac8b8b) Thanks [@fwang](https://github.com/fwang)! - Respect env var credentials over profile

## 2.0.0-rc.50

### Patch Changes

- [#2375](https://github.com/serverless-stack/sst/pull/2375) [`99a227f45`](https://github.com/serverless-stack/sst/commit/99a227f454a33d4b852eef5be6d99a3fcfda6096) Thanks [@github-actions](https://github.com/apps/github-actions)! - Print helper message when no connection

- [`7692adacf`](https://github.com/serverless-stack/sst/commit/7692adacf4fd0e472fe512915954a5e596eb0890) Thanks [@fwang](https://github.com/fwang)! - Cli flags override config options

- [#2375](https://github.com/serverless-stack/sst/pull/2375) [`796e6ab1d`](https://github.com/serverless-stack/sst/commit/796e6ab1dd113ac1adda344602683dcacef591d8) Thanks [@github-actions](https://github.com/apps/github-actions)! - Clear screen without wiping out previous output

## 2.0.0-rc.49

### Patch Changes

- [`e6b9fd7fa`](https://github.com/serverless-stack/sst/commit/e6b9fd7fad80973e7604b9dbd581818b3a657e61) Thanks [@thdxr](https://github.com/thdxr)! - Astro dropin

## 2.0.0-rc.48

### Patch Changes

- [#2370](https://github.com/serverless-stack/sst/pull/2370) [`bd089d94c`](https://github.com/serverless-stack/sst/commit/bd089d94c9e83e9797b63d4c9b21668d176a908c) Thanks [@github-actions](https://github.com/apps/github-actions)! - Remove deprecated v1 constructs & methods

- [#2370](https://github.com/serverless-stack/sst/pull/2370) [`b6b943fd9`](https://github.com/serverless-stack/sst/commit/b6b943fd9ea149b4689b308aef2329ac25d89a5e) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add deploy error helper

## 2.0.0-rc.47

### Patch Changes

- [`077fb7763`](https://github.com/serverless-stack/sst/commit/077fb7763e93c8f9a7148681ad309dfa0f1dced1) Thanks [@thdxr](https://github.com/thdxr)! - Fix

## 2.0.0-rc.46

### Patch Changes

- [#2368](https://github.com/serverless-stack/sst/pull/2368) [`b24783e19`](https://github.com/serverless-stack/sst/commit/b24783e19a43e2daea8f3f608bb8afd98d7536c8) Thanks [@github-actions](https://github.com/apps/github-actions)! - Update sst deploy UI

- [`47743f47d`](https://github.com/serverless-stack/sst/commit/47743f47d62154335d7e3643417e34bcb0d6ff59) Thanks [@thdxr](https://github.com/thdxr)! - Fixed cli crash on out of order messages

## 2.0.0-rc.45

### Patch Changes

- [`d45f56f45`](https://github.com/serverless-stack/sst/commit/d45f56f45860ca6fe3e0b97914835edeed54bee3) Thanks [@fwang](https://github.com/fwang)! - Show construct path instead of logical id in logs

## 2.0.0-rc.44

### Patch Changes

- [#2366](https://github.com/serverless-stack/sst/pull/2366) [`ac1a3a7eb`](https://github.com/serverless-stack/sst/commit/ac1a3a7ebc531d8954bdc0aa1f228100ff6cf0c2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Wire up increase timeout

- [`a5e24bac6`](https://github.com/serverless-stack/sst/commit/a5e24bac60f9ce03a6ebad38527157f85d8d7fe8) Thanks [@thdxr](https://github.com/thdxr)! - Override from .env files

## 2.0.0-rc.43

### Patch Changes

- [`21afe80ec`](https://github.com/serverless-stack/sst/commit/21afe80ec4afbb82974347582a33f8ca1a56085a) Thanks [@thdxr](https://github.com/thdxr)! - Force stacktrace

## 2.0.0-rc.42

### Patch Changes

- [`58967f452`](https://github.com/serverless-stack/sst/commit/58967f452b73e80c2fce6aae4c763eaadb97fc82) Thanks [@thdxr](https://github.com/thdxr)! - Updated

## 2.0.0-rc.41

### Patch Changes

- [#2357](https://github.com/serverless-stack/sst/pull/2357) [`439aaa3cb`](https://github.com/serverless-stack/sst/commit/439aaa3cb64eee4bfad590f419d4c812e8f9f57c) Thanks [@github-actions](https://github.com/apps/github-actions)! - UI

- [#2357](https://github.com/serverless-stack/sst/pull/2357) [`6eef49a90`](https://github.com/serverless-stack/sst/commit/6eef49a90501fc00bdf637afd70c1005dcf2b83d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Improve sst diff command

## 2.0.0-rc.40

### Patch Changes

- [`b30390e1a`](https://github.com/serverless-stack/sst/commit/b30390e1a30c51dd513c06eb6e8f2aeddd85345c) Thanks [@fwang](https://github.com/fwang)! - Improve CDK bootstrap experience

- [#2353](https://github.com/serverless-stack/sst/pull/2353) [`fac18bacf`](https://github.com/serverless-stack/sst/commit/fac18bacf42307f58676ea1f9498120d27bf5045) Thanks [@github-actions](https://github.com/apps/github-actions)! - Rename stack output key name for metadata

## 2.0.0-rc.39

### Patch Changes

- [`06b78ad7f`](https://github.com/serverless-stack/sst/commit/06b78ad7fb2e2cb8d72161682758df4448ba093a) Thanks [@fwang](https://github.com/fwang)! - Optimize asset publishing

## 2.0.0-rc.38

### Patch Changes

- [`cd2576384`](https://github.com/serverless-stack/sst/commit/cd25763845e96d55fc2aa86c35c15a4ca942a924) Thanks [@thdxr](https://github.com/thdxr)! - Enable secrets commands

## 2.0.0-rc.37

### Patch Changes

- [`a0d3fca48`](https://github.com/serverless-stack/sst/commit/a0d3fca4860364bafc7183aa4e34d4be34aeb9c2) Thanks [@thdxr](https://github.com/thdxr)! - Support specifying role to assume

## 2.0.0-rc.36

### Patch Changes

- [#2347](https://github.com/serverless-stack/sst/pull/2347) [`b9c18eb50`](https://github.com/serverless-stack/sst/commit/b9c18eb507ab93dbec7c8ec5556deeeb2fee04b2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Resource binding: fix Lambda environment key name

- [`8ca68e477`](https://github.com/serverless-stack/sst/commit/8ca68e47764a5f09c068bbd99afdd7cda9217cd7) Thanks [@fwang](https://github.com/fwang)! - Emit stack metadata updated event

- [#2347](https://github.com/serverless-stack/sst/pull/2347) [`0d46c1e3e`](https://github.com/serverless-stack/sst/commit/0d46c1e3e9d420da92bc5d4e86ae8495ac97ab22) Thanks [@github-actions](https://github.com/apps/github-actions)! - Optimize publish assets

## 2.0.0-rc.35

### Patch Changes

- [`ff77d673c`](https://github.com/serverless-stack/sst/commit/ff77d673cfc4c9a5b401c850a4d172aaf275f34b) Thanks [@thdxr](https://github.com/thdxr)! - Fix ack messages not being forwarded to IoT

## 2.0.0-rc.34

### Patch Changes

- [`3b8ef8fab`](https://github.com/serverless-stack/sst/commit/3b8ef8fab8ee061dd49a3a237c8ae5dcc967e4c0) Thanks [@thdxr](https://github.com/thdxr)! - Fix function acknowledgement

## 2.0.0-rc.33

### Patch Changes

- [`d03790277`](https://github.com/serverless-stack/sst/commit/d03790277268bbf0aae6e4211a0ff3d44e17fff3) Thanks [@thdxr](https://github.com/thdxr)! - New UI

## 2.0.0-rc.32

### Patch Changes

- [`3d0313264`](https://github.com/serverless-stack/sst/commit/3d03132646ca3ece1d4d1df8c875b34c8052d52e) Thanks [@fwang](https://github.com/fwang)! - Fix partition typo

## 2.0.0-rc.31

### Patch Changes

- [#2329](https://github.com/serverless-stack/sst/pull/2329) [`c98a55b8b`](https://github.com/serverless-stack/sst/commit/c98a55b8bbe57ea9304dd4199f5e40893c1968db) Thanks [@alistairstead](https://github.com/alistairstead)! - Update bind to inherit the full env of the parent process

## 2.0.0-rc.30

### Major Changes

- [`64c881e19`](https://github.com/serverless-stack/sst/commit/64c881e192f999178c3d8a2d10a14ac8f7bc9693) Thanks [@fwang](https://github.com/fwang)! - Support AWS China region

## 2.0.0-rc.29

### Patch Changes

- [`3463f929f`](https://github.com/serverless-stack/sst/commit/3463f929fda97c23748de5663111bb95e0664979) Thanks [@thdxr](https://github.com/thdxr)! - Performance and UI improvements

## 2.0.0-rc.28

### Patch Changes

- [#2324](https://github.com/serverless-stack/sst/pull/2324) [`5d06e81aa`](https://github.com/serverless-stack/sst/commit/5d06e81aa30994dfe1109a488f09ab2a3c9fe467) Thanks [@github-actions](https://github.com/apps/github-actions)! - Test

- [`9db435cd2`](https://github.com/serverless-stack/sst/commit/9db435cd24a0c286d74a21d68e84bc8dae05a4b3) Thanks [@fwang](https://github.com/fwang)! - Fix SST bootstrap issue

## 2.0.0-rc.27

### Patch Changes

- [`0944cd2fe`](https://github.com/serverless-stack/sst/commit/0944cd2fe1b7818d6c58b6a240120417e78d2ef4) Thanks [@thdxr](https://github.com/thdxr)! - Minor bug fixes

## 2.0.0-rc.26

### Patch Changes

- [`16ea533bd`](https://github.com/serverless-stack/sst/commit/16ea533bd322bb55bad8a3ec088a4a680b69316b) Thanks [@fwang](https://github.com/fwang)! - Subscribe to CloudFormation events and store metadata asyncly

## 2.0.0-rc.25

### Patch Changes

- [`e55348b10`](https://github.com/serverless-stack/sst/commit/e55348b1021dfcbf706fcf29cd3325d47d716d91) Thanks [@thdxr](https://github.com/thdxr)! - Fix resolve

## 2.0.0-rc.24

### Patch Changes

- [`e248df358`](https://github.com/serverless-stack/sst/commit/e248df3586a47e9d9774a5cdbe1b88e3c8d1b736) Thanks [@thdxr](https://github.com/thdxr)! - Support diff command

## 2.0.0-rc.23

### Patch Changes

- [`a10b167fd`](https://github.com/serverless-stack/sst/commit/a10b167fd98f8c0057631996e3c9f0615bb9fc41) Thanks [@thdxr](https://github.com/thdxr)! - Fix kysely type generator

## 2.0.0-rc.22

### Patch Changes

- [`54b0fce33`](https://github.com/serverless-stack/sst/commit/54b0fce33c61d42c4a14e686790b61b1cdc82733) Thanks [@thdxr](https://github.com/thdxr)! - Fix create-sst

## 2.0.0-rc.21

### Patch Changes

- [#2313](https://github.com/serverless-stack/sst/pull/2313) [`90e56aab9`](https://github.com/serverless-stack/sst/commit/90e56aab93479bcb35866693e7cd3437c666d195) Thanks [@github-actions](https://github.com/apps/github-actions)! - Bug fixes

- [#2313](https://github.com/serverless-stack/sst/pull/2313) [`e6a64785c`](https://github.com/serverless-stack/sst/commit/e6a64785ca4d922acebb05eb2835b2b0e27a013d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Properly set node16 as default runtime

## 2.0.0-rc.20

### Patch Changes

- [`4945e8e87`](https://github.com/serverless-stack/sst/commit/4945e8e87537bfe4789bf22b0ded9f7afb9f1458) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix Edge Function upgrade issue

- [`4945e8e87`](https://github.com/serverless-stack/sst/commit/4945e8e87537bfe4789bf22b0ded9f7afb9f1458) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix dev mode

## 2.0.0-rc.19

### Patch Changes

- [`c5eb4d431`](https://github.com/serverless-stack/sst/commit/c5eb4d43196925ea14e5f01f529e64d44e50dbbc) Thanks [@thdxr](https://github.com/thdxr)! - Ignore symlink failures for node_modules

- [`c5eb4d431`](https://github.com/serverless-stack/sst/commit/c5eb4d43196925ea14e5f01f529e64d44e50dbbc) Thanks [@thdxr](https://github.com/thdxr)! - Fix windows issue when running function locally

## 2.0.0-rc.18

### Patch Changes

- [`413381061`](https://github.com/serverless-stack/sst/commit/413381061bea3c6622240a2eff264c3733cd02cf) Thanks [@thdxr](https://github.com/thdxr)! - Simple template for create-sst

## 2.0.0-rc.17

### Patch Changes

- [`acce2b49f`](https://github.com/serverless-stack/sst/commit/acce2b49fc68656a4d2d9bb707d3575f8725c1a1) Thanks [@thdxr](https://github.com/thdxr)! - Fix missing ping endpoint

- [#2307](https://github.com/serverless-stack/sst/pull/2307) [`1eb6e7729`](https://github.com/serverless-stack/sst/commit/1eb6e7729916fcaa5089799a0a4649a4b97ae1fa) Thanks [@github-actions](https://github.com/apps/github-actions)! - Sites: default path to current directory "."

## 2.0.0-rc.16

### Patch Changes

- [`8371c7bb9`](https://github.com/serverless-stack/sst/commit/8371c7bb935f9ae9c02e2790bb4735a94a022146) Thanks [@fwang](https://github.com/fwang)! - StaticSite: fix script path

## 2.0.0-rc.15

### Patch Changes

- [`591b21b83`](https://github.com/serverless-stack/sst/commit/591b21b83c94ba87b4079f33d783fd4b672db603) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: fix script path

## 2.0.0-rc.14

### Patch Changes

- [`11ab78085`](https://github.com/serverless-stack/sst/commit/11ab780857426958aefbbe5b75667c3be360f047) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: fix function archiver path

## 2.0.0-rc.13

### Patch Changes

- [`600236feb`](https://github.com/serverless-stack/sst/commit/600236feb1d2e706f62c1fb29d4a2744a8ecc713) Thanks [@thdxr](https://github.com/thdxr)! - Require js/ts based config file. Checkout the migration guide for an example: https://github.com/serverless-stack/sst/tree/sst2/packages/sst

## 2.0.0-rc.12

### Patch Changes

- [#2297](https://github.com/serverless-stack/sst/pull/2297) [`f37521f7f`](https://github.com/serverless-stack/sst/commit/f37521f7fbfbdfb63f0fc60b55bd9e0a26e3ddca) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fail faster when no sst dev session is running

- [`b4143189f`](https://github.com/serverless-stack/sst/commit/b4143189fd98c66daf8d79f25898692912e618a2) Thanks [@thdxr](https://github.com/thdxr)! - `sst update` should keep `constructs` dependency update

## 2.0.0-rc.11

### Patch Changes

- [`b6c7e83f8`](https://github.com/serverless-stack/sst/commit/b6c7e83f8d2798e6ad068cce2114c3f6995d426c) Thanks [@thdxr](https://github.com/thdxr)! - Fix issue with sst update command not updating alpha dependencies correctly

- [#2296](https://github.com/serverless-stack/sst/pull/2296) [`403ba4fb3`](https://github.com/serverless-stack/sst/commit/403ba4fb301b68bdec25070ab979c1844c7a5621) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix flaky error about symbol context

## 2.0.0-rc.10

### Patch Changes

- [`293aee1cb`](https://github.com/serverless-stack/sst/commit/293aee1cb7861404d39ece9dd97611060d0b14e5) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: zip OpenNext server function

- [#2293](https://github.com/serverless-stack/sst/pull/2293) [`b5eddfdd4`](https://github.com/serverless-stack/sst/commit/b5eddfdd4326116774e78a1318a0503a1ee899d4) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix RDS migrator and Script bundling issue

## 2.0.0-rc.9

### Patch Changes

- [#2292](https://github.com/serverless-stack/sst/pull/2292) [`76898899a`](https://github.com/serverless-stack/sst/commit/76898899a0bc8bf54d9703c5aaf5ebda782693f4) Thanks [@github-actions](https://github.com/apps/github-actions)! - Exit with correct code if deploy fails

## 2.0.0-rc.8

### Patch Changes

- [`b36b0fca1`](https://github.com/serverless-stack/sst/commit/b36b0fca19df7e0c65707d0e4fa110ecf24dc142) Thanks [@thdxr](https://github.com/thdxr)! - Update esbuild

- [`68f7cd155`](https://github.com/serverless-stack/sst/commit/68f7cd155b0f98592bb15ea7b78a915ac538f008) Thanks [@thdxr](https://github.com/thdxr)! - Remove unnecessary deps

## 2.0.0-rc.7

### Patch Changes

- [`8803dbf5c`](https://github.com/serverless-stack/sst/commit/8803dbf5c3ed67cc8e6fdf52818b914e65afd129) Thanks [@thdxr](https://github.com/thdxr)! - Use isESM check

## 2.0.0-rc.6

### Patch Changes

- [`0c7d4050e`](https://github.com/serverless-stack/sst/commit/0c7d4050e7c24892ee132d3902bc2cc94414e1b5) Thanks [@thdxr](https://github.com/thdxr)! - Workaround for wrap-ansi being referenced incorrectly by aws-cdk

## 2.0.0-rc.5

### Patch Changes

- [`5c942c87c`](https://github.com/serverless-stack/sst/commit/5c942c87c30e7ebe2b68c4348ce7141c77dac765) Thanks [@thdxr](https://github.com/thdxr)! - Always ignore sst when building stacks

## 2.0.0-rc.4

### Patch Changes

- [`1f8632cf4`](https://github.com/serverless-stack/sst/commit/1f8632cf43f36267f42bd299952568ce08d2fafc) Thanks [@thdxr](https://github.com/thdxr)! - Use latest tag for sst package

## 2.0.0-rc.3

### Patch Changes

- [`c01a9b390`](https://github.com/serverless-stack/sst/commit/c01a9b390ef6692c4a60599fca26f0f3fcae9b3b) Thanks [@thdxr](https://github.com/thdxr)! - Add archiver as dependency

## 2.0.0-rc.2

### Patch Changes

- [`cb10b5a0f`](https://github.com/serverless-stack/sst/commit/cb10b5a0ffecfe0ada18f9287b8c6edc99fd7642) Thanks [@thdxr](https://github.com/thdxr)! - create-sst should use RC

## 2.0.0-rc.1

### Patch Changes

- [`558c3da3e`](https://github.com/serverless-stack/sst/commit/558c3da3e1352127a2fdddc3a54416b1904c85ac) Thanks [@thdxr](https://github.com/thdxr)! - Update command sticks to rc

## 2.0.0-rc.0

### Major Changes

- [`db5aadfbc`](https://github.com/serverless-stack/sst/commit/db5aadfbca8628eb23eee486c07e5819bb6cf750) Thanks [@thdxr](https://github.com/thdxr)! - 2.0

## 1.17.1

### Patch Changes

- Updated dependencies [[`f3689cad0`](https://github.com/serverless-stack/sst/commit/f3689cad04d4c98bd78fd935d6bf641070c2deb7)]:
  - @serverless-stack/node@1.17.1

## 1.17.0

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.17.0

## 1.16.3

### Patch Changes

- Updated dependencies [[`37aa18ca8`](https://github.com/serverless-stack/sst/commit/37aa18ca8d938574cd4ae70ba299ec37259fcb45)]:
  - @serverless-stack/node@1.16.3

## 1.16.2

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.16.2

## 1.16.1

### Patch Changes

- Updated dependencies [[`aa1122646`](https://github.com/serverless-stack/sst/commit/aa1122646fa0e808a91d585513cb5cd6759ed2c1), [`aa1122646`](https://github.com/serverless-stack/sst/commit/aa1122646fa0e808a91d585513cb5cd6759ed2c1), [`aa1122646`](https://github.com/serverless-stack/sst/commit/aa1122646fa0e808a91d585513cb5cd6759ed2c1)]:
  - @serverless-stack/node@1.16.1

## 1.16.0

### Patch Changes

- Updated dependencies [[`f2ce4f7b2`](https://github.com/serverless-stack/sst/commit/f2ce4f7b2f4d92686ef7d24ece0ae6fd44223898)]:
  - @serverless-stack/node@1.16.0

## 1.15.16

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.16

## 1.15.15

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.15

## 1.15.14

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.14

## 1.15.13

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.13

## 1.15.12

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.12

## 1.15.11

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.11

## 1.15.10

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.10

## 1.15.9

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.9

## 1.15.8

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.8

## 1.15.7

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.7

## 1.15.6

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.6

## 1.15.5

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.5

## 1.15.4

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.4

## 1.15.3

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.3

## 1.15.2

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.2

## 1.15.1

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.15.1

## 1.15.0

### Patch Changes

- Updated dependencies [[`86137b645`](https://github.com/serverless-stack/sst/commit/86137b645311473b8d51ec8ee3bdfb70656f3c58)]:
  - @serverless-stack/node@1.15.0

## 1.14.4

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.14.4

## 1.14.3

### Patch Changes

- [#2070](https://github.com/serverless-stack/sst/pull/2070) [`8ceb4ab7c`](https://github.com/serverless-stack/sst/commit/8ceb4ab7c92f92fac4d4177d498e4e365630d5b8) Thanks [@estebanprimost](https://github.com/estebanprimost)! - Fix "Could not unzip uploaded file" deployment error

- Updated dependencies []:
  - @serverless-stack/node@1.14.3

## 1.14.2

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.14.2

## 1.14.1

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.14.1

## 1.14.0

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.14.0

## 1.13.0

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.13.0

## 1.12.4

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.12.4

## 1.12.3

### Patch Changes

- Updated dependencies [[`cacb73493`](https://github.com/serverless-stack/sst/commit/cacb73493295619538375ff9feb6ee559be1dfa3)]:
  - @serverless-stack/node@1.12.3

## 1.12.2

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.12.2

## 1.12.1

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.12.1

## 1.12.0

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.12.0

## 1.11.2

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.11.2

## 1.11.1

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.11.1

## 1.11.0

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.11.0

## 1.10.6

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.10.6

## 1.10.5

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.10.5

## 1.10.4

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.10.4

## 1.10.3

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.10.3

## 1.10.2

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.10.2

## 1.10.1

### Patch Changes

- Updated dependencies []:
  - @serverless-stack/node@1.10.1

## 1.10.0

### Patch Changes

- Updated dependencies [[`c628edfe1`](https://github.com/serverless-stack/sst/commit/c628edfe1034f0a6ee788ec41b052353a73c5438)]:
  - @serverless-stack/node@1.10.0

## 0.0.0-20220811185430

### Patch Changes

- Updated dependencies [b4eb4db26]
  - @serverless-stack/lambda@0.0.0-20220811185430

## 0.0.0-20220811125337

### Patch Changes

- Updated dependencies [b4eb4db26]
  - @serverless-stack/lambda@0.0.0-20220811125337

## 0.0.0-20220811124227

### Patch Changes

- Updated dependencies [b4eb4db26]
  - @serverless-stack/lambda@0.0.0-20220811124227
