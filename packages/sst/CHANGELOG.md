# @serverless-stack/cli2

## 2.23.2

### Patch Changes

- [`ac84ab5c3`](https://github.com/serverless-stack/sst/commit/ac84ab5c39a8edf4b72062bd583d098804dfb598) Thanks [@fwang](https://github.com/fwang)! - sst update: do not update packages prefixed "sst-"

- [#3103](https://github.com/serverless-stack/sst/pull/3103) [`d8cecd35e`](https://github.com/serverless-stack/sst/commit/d8cecd35e0aa422d9bbcb885c5bcb9057e6b398d) Thanks [@berenddeboer](https://github.com/berenddeboer)! - Function/java: run only one gradle build per directory

- [`c2fb7942f`](https://github.com/serverless-stack/sst/commit/c2fb7942fd3e48ecc9a9250226bf1bbb2b29d426) Thanks [@fwang](https://github.com/fwang)! - Service: add "file" prop to allow passing in path to Dockerfile

- [#3180](https://github.com/serverless-stack/sst/pull/3180) [`818e33dd7`](https://github.com/serverless-stack/sst/commit/818e33dd7846bd532417ae926a0c0a3570da2b68) Thanks [@oyed](https://github.com/oyed)! - sst update: respect trailing newline char in package.json

## 2.23.1

### Patch Changes

- [`cb9744e57`](https://github.com/serverless-stack/sst/commit/cb9744e57d605a2fda82d7e5f1583b212f24b365) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: allow using CDK bootstrap bucket instead of creating a new one

## 2.23.0

### Minor Changes

- [#3167](https://github.com/serverless-stack/sst/pull/3167) [`e428a9e0a`](https://github.com/serverless-stack/sst/commit/e428a9e0ab030f6852f704dd7f729929168c9d1c) Thanks [@fwang](https://github.com/fwang)! - Service: deploy Fargate services

### Patch Changes

- [#3167](https://github.com/serverless-stack/sst/pull/3167) [`e428a9e0a`](https://github.com/serverless-stack/sst/commit/e428a9e0ab030f6852f704dd7f729929168c9d1c) Thanks [@fwang](https://github.com/fwang)! - sst bind: support binding undeployed Parameter values

- [#3177](https://github.com/serverless-stack/sst/pull/3177) [`8a31945c4`](https://github.com/serverless-stack/sst/commit/8a31945c44048308b5f8cf4cc7e5fe490eb835c9) Thanks [@fwang](https://github.com/fwang)! - AstroSite: support streaming

- [`601da6101`](https://github.com/serverless-stack/sst/commit/601da6101f467111370dc38436e48531a4864815) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: allow using existing S3 buckets

- [#3182](https://github.com/serverless-stack/sst/pull/3182) [`01304e35b`](https://github.com/serverless-stack/sst/commit/01304e35b90e2337cb141a687e9b8c94fee38b64) Thanks [@pawelblaszczyk5](https://github.com/pawelblaszczyk5)! - EventBus: pass attempts count to EventHandler callback

## 2.22.11

### Patch Changes

- [#3173](https://github.com/serverless-stack/sst/pull/3173) [`567fc00cf`](https://github.com/serverless-stack/sst/commit/567fc00cff6cba5091de192a1f0ee6f22c8e0391) Thanks [@khuezy](https://github.com/khuezy)! - NextjsSite: add "next-url" to allowed headers

- [`fdfcfb221`](https://github.com/serverless-stack/sst/commit/fdfcfb22181a763f85b59830f10450752194a8af) Thanks [@thdxr](https://github.com/thdxr)! - dev: update bridge function to node18

- [#3179](https://github.com/serverless-stack/sst/pull/3179) [`04851db59`](https://github.com/serverless-stack/sst/commit/04851db59cb52f2cc2beafb3f52f0310c65d5b23) Thanks [@jamesgibbons92](https://github.com/jamesgibbons92)! - fix: dispose of esbuild context when in deploy mode

## 2.22.10

### Patch Changes

- [`f69855c2b`](https://github.com/serverless-stack/sst/commit/f69855c2b03aa92a6262f1a2b0886db1cf81e067) Thanks [@fwang](https://github.com/fwang)! - Allow setting app stage via SST_STAGE environment variable

## 2.22.9

### Patch Changes

- [`b5d0dd819`](https://github.com/serverless-stack/sst/commit/b5d0dd81986b03faf47e99987ecff9118a07ee5a) Thanks [@fwang](https://github.com/fwang)! - SsrSite: cdk.function return CDK Function instance

## 2.22.8

### Patch Changes

- [`71c9bab6c`](https://github.com/serverless-stack/sst/commit/71c9bab6c54e6f5e41688893797bdd8d13d8effa) Thanks [@fwang](https://github.com/fwang)! - Function/Job: support docker --file option

## 2.22.7

### Patch Changes

- [#2877](https://github.com/serverless-stack/sst/pull/2877) [`ec145f078`](https://github.com/serverless-stack/sst/commit/ec145f0781de07e7c51224f0163326440e198231) Thanks [@relsunkaev](https://github.com/relsunkaev)! - SsrFunction: respect architecture setting

- [#3164](https://github.com/serverless-stack/sst/pull/3164) [`14418e889`](https://github.com/serverless-stack/sst/commit/14418e889f73ed2f334724d18d5905f73f2b2c2c) Thanks [@psolidgold](https://github.com/psolidgold)! - Function: Add policy statement resource for Function to access bootstrap bucket objects during live debugging.

- [`6d076a004`](https://github.com/serverless-stack/sst/commit/6d076a00433ae4ae89073386fbc6996a1e42f76f) Thanks [@thdxr](https://github.com/thdxr)! - dev: fix issue with node_modules not symlinking on devmode rebuilds

- [#3163](https://github.com/serverless-stack/sst/pull/3163) [`e77d397bb`](https://github.com/serverless-stack/sst/commit/e77d397bbb1b775967fbd72c5a6788075bc93b11) Thanks [@khuezy](https://github.com/khuezy)! - NextjsSite: add `next-url` to cache policy

- [#3135](https://github.com/serverless-stack/sst/pull/3135) [`a8fc8208d`](https://github.com/serverless-stack/sst/commit/a8fc8208d5d90f38855dc7f70d01194fc291e181) Thanks [@jonnedeprez](https://github.com/jonnedeprez)! - Table: prevent overwriting FilterCriteria in consumers

## 2.22.6

### Patch Changes

- [`ba2156ff7`](https://github.com/serverless-stack/sst/commit/ba2156ff74b8a8e3d48ea243f17a743c2b134502) Thanks [@fwang](https://github.com/fwang)! - Function: do not cache esbuild context for sst build

## 2.22.5

### Patch Changes

- [`95297c4f9`](https://github.com/serverless-stack/sst/commit/95297c4f92d56c420ef37b7c2dbc6dabaa43bfdb) Thanks [@thdxr](https://github.com/thdxr)! - function: revert limited iot permissions

## 2.22.4

### Patch Changes

- [`3503231e8`](https://github.com/serverless-stack/sst/commit/3503231e834823b646288c574a7377a406da6d10) Thanks [@thdxr](https://github.com/thdxr)! - function: limit iot permissions

## 2.22.3

### Patch Changes

- [`f77e1c869`](https://github.com/serverless-stack/sst/commit/f77e1c86948b87cff5fb8eed86852a3f2c54d860) Thanks [@fwang](https://github.com/fwang)! - Job: support ARM architecture

## 2.22.2

### Patch Changes

- [`01aab434c`](https://github.com/serverless-stack/sst/commit/01aab434c0ee86135a3e1dcad9eaa93f37872038) Thanks [@thdxr](https://github.com/thdxr)! - cli: properly dispose of esbuild context on exit

- [`cf9723d87`](https://github.com/serverless-stack/sst/commit/cf9723d8776f367e8a2861bc9ab5b8bbc0021a37) Thanks [@thdxr](https://github.com/thdxr)! - cli: support setting outputs path in config

- [`8612a54f9`](https://github.com/serverless-stack/sst/commit/8612a54f97c3fb9983c13c8f8d05a55b8f176a12) Thanks [@fwang](https://github.com/fwang)! - Cognito: support gov cloud identity name

- [#3133](https://github.com/serverless-stack/sst/pull/3133) [`f708fa980`](https://github.com/serverless-stack/sst/commit/f708fa980c5622149cb8f66d9c29faaeef89c2bd) Thanks [@pzeinlinger](https://github.com/pzeinlinger)! - Function/go: fix incorrect go -tags flag

- [#3131](https://github.com/serverless-stack/sst/pull/3131) [`66546dfee`](https://github.com/serverless-stack/sst/commit/66546dfee511810ed8fba7357247b4f9afb500eb) Thanks [@nick](https://github.com/nick)! - Bump esbuild version

## 2.22.1

### Patch Changes

- [`acf2cca2e`](https://github.com/serverless-stack/sst/commit/acf2cca2ed1bd910c74ace96ec9d41e303b88321) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: update to OpenNext 2.0.5

## 2.22.0

### Minor Changes

- [#3072](https://github.com/serverless-stack/sst/pull/3072) [`cf5d492da`](https://github.com/serverless-stack/sst/commit/cf5d492da821adb3fdf22ff99f3345249621b27e) Thanks [@berenddeboer](https://github.com/berenddeboer)! - Function: drop deprecated runtimes

### Patch Changes

- [#3101](https://github.com/serverless-stack/sst/pull/3101) [`a4b2e7bbc`](https://github.com/serverless-stack/sst/commit/a4b2e7bbc1ed153b2462b29d3487f6c684ae270f) Thanks [@gvidon](https://github.com/gvidon)! - Function/rust: display build errors

- [#3096](https://github.com/serverless-stack/sst/pull/3096) [`c3ca57db0`](https://github.com/serverless-stack/sst/commit/c3ca57db0d1868fddde16fa7ed8df467acba243a) Thanks [@ffxsam](https://github.com/ffxsam)! - SsrSite: support `fileOptions` props

- [#3116](https://github.com/serverless-stack/sst/pull/3116) [`2b9e55979`](https://github.com/serverless-stack/sst/commit/2b9e559790ca98f01f631c97941963c18c3ed21c) Thanks [@pzeinlinger](https://github.com/pzeinlinger)! - Function/go: support Golang build options

- [#3099](https://github.com/serverless-stack/sst/pull/3099) [`f8fb5b284`](https://github.com/serverless-stack/sst/commit/f8fb5b284d4e72f61ed1638b35fd364625a5e5a0) Thanks [@Nirlah](https://github.com/Nirlah)! - Function/rust: support arm64 Rust runtime

- [`efadc8373`](https://github.com/serverless-stack/sst/commit/efadc8373ee9e5e8e589e8af68fbf747dc854906) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: update message when updating the stack

## 2.21.8

### Patch Changes

- [#3106](https://github.com/serverless-stack/sst/pull/3106) [`ded5370c1`](https://github.com/serverless-stack/sst/commit/ded5370c1f26a16616545f3588a11a3d466277df) Thanks [@MattJenko](https://github.com/MattJenko)! - Bootstrap: support custom permissions boundary

- [#3102](https://github.com/serverless-stack/sst/pull/3102) [`2739d664e`](https://github.com/serverless-stack/sst/commit/2739d664e19fc7252ee4ef1a9575cb67a09e5f13) Thanks [@berenddeboer](https://github.com/berenddeboer)! - RDS: grant migration function permission to decrypt custom secret encryption key

- [#3095](https://github.com/serverless-stack/sst/pull/3095) [`b68d57a62`](https://github.com/serverless-stack/sst/commit/b68d57a624a3876af94bbd6c4ae88f8c5c21d858) Thanks [@michaelgmcd](https://github.com/michaelgmcd)! - RemixSite: ensure build directory exists

- [`6649b3cc3`](https://github.com/serverless-stack/sst/commit/6649b3cc3600c4a6c51b84eba40fd4bb747d34d9) Thanks [@thdxr](https://github.com/thdxr)! - console: restores function invocations on console refresh, supports clearing

## 2.21.7

### Patch Changes

- [`64723ffca`](https://github.com/serverless-stack/sst/commit/64723ffcaeb755b6a361a3c412236770a219814d) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix thrashing id when multiple sites are defined

## 2.21.6

### Patch Changes

- [`3ab8384f8`](https://github.com/serverless-stack/sst/commit/3ab8384f87b81bd956371e0d6805e7493b539731) Thanks [@thdxr](https://github.com/thdxr)! - console: simplified event publishing

## 2.21.5

### Patch Changes

- [`616be5f1b`](https://github.com/serverless-stack/sst/commit/616be5f1be7436f756f69592553b6f43f83185b6) Thanks [@fwang](https://github.com/fwang)! - Fix hosted zone not found

## 2.21.4

### Patch Changes

- [`7edbb7876`](https://github.com/serverless-stack/sst/commit/7edbb7876687f7704bffe4bec744d3dc30f76a4b) Thanks [@thdxr](https://github.com/thdxr)! - forward all events

## 2.21.3

### Patch Changes

- [`7528d6841`](https://github.com/serverless-stack/sst/commit/7528d6841cc01df7420a4bf45085a6f8af2d63fe) Thanks [@thdxr](https://github.com/thdxr)! - forward realtime events to new console

## 2.21.2

### Patch Changes

- [`bf06ac82b`](https://github.com/serverless-stack/sst/commit/bf06ac82bee9765ab85fba61593d44d83fd15722) Thanks [@thdxr](https://github.com/thdxr)! - function: make the live debug bridge less chatty

## 2.21.1

### Patch Changes

- [`acbdf9fd3`](https://github.com/serverless-stack/sst/commit/acbdf9fd3c5f8874b266331b6ee9fe6af9536d42) Thanks [@fwang](https://github.com/fwang)! - Function: support overriding docker CMD

## 2.21.0

### Minor Changes

- [#3111](https://github.com/serverless-stack/sst/pull/3111) [`db399a94d`](https://github.com/serverless-stack/sst/commit/db399a94ddf89fe54cbd5c1aae42482433001952) Thanks [@fwang](https://github.com/fwang)! - Job: support container runtime

### Patch Changes

- [#3111](https://github.com/serverless-stack/sst/pull/3111) [`db399a94d`](https://github.com/serverless-stack/sst/commit/db399a94ddf89fe54cbd5c1aae42482433001952) Thanks [@fwang](https://github.com/fwang)! - Job: support canceling job

## 2.20.1

### Patch Changes

- [`640f7c871`](https://github.com/serverless-stack/sst/commit/640f7c8710a136e4bae32ceaeaeff1f35fea292f) Thanks [@thdxr](https://github.com/thdxr)! - fix: esbuild has issues with keepName

## 2.20.0

### Minor Changes

- [`cf1dbb553`](https://github.com/serverless-stack/sst/commit/cf1dbb553ea9a228c50ea30fd7baf4daafc4241c) Thanks [@thdxr](https://github.com/thdxr)! - functions: update esbuild

## 2.19.2

### Patch Changes

- [`86a50659d`](https://github.com/serverless-stack/sst/commit/86a50659d4985d5c6fa359a242762fe80d54b1fa) Thanks [@thdxr](https://github.com/thdxr)! - metadata: add ssrfunction to metadata

## 2.19.1

### Patch Changes

- [`9176d8ad1`](https://github.com/serverless-stack/sst/commit/9176d8ad12a24982abf0d7c0495025faba145727) Thanks [@fwang](https://github.com/fwang)! - Disable pathMetadata by default

- [`05dab5b8b`](https://github.com/serverless-stack/sst/commit/05dab5b8b2c814d164be259df2b79858ffccb34c) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix CloudFront not invalidated when s3 assets unchanged

- [`426713243`](https://github.com/serverless-stack/sst/commit/42671324332dfa114bfefd4a6f7daba374b0ef23) Thanks [@fwang](https://github.com/fwang)! - Support CloudFormation resources tree view

## 2.19.0

### Minor Changes

- [#3085](https://github.com/serverless-stack/sst/pull/3085) [`134b4f7e1`](https://github.com/serverless-stack/sst/commit/134b4f7e16e3802eedf59c4fd6bbf454589c5543) Thanks [@fwang](https://github.com/fwang)! - Function: container support

## 2.18.4

### Patch Changes

- [#3083](https://github.com/serverless-stack/sst/pull/3083) [`6effd7d35`](https://github.com/serverless-stack/sst/commit/6effd7d351f2a101394845b9acfbb9cbbc2c522e) Thanks [@khuezy](https://github.com/khuezy)! - NextjsSite: update OpenNext 2.0.4

- [#3083](https://github.com/serverless-stack/sst/pull/3083) [`6effd7d35`](https://github.com/serverless-stack/sst/commit/6effd7d351f2a101394845b9acfbb9cbbc2c522e) Thanks [@khuezy](https://github.com/khuezy)! - SsrSite: fix multiple s3 origins created for static assets

- [#3076](https://github.com/serverless-stack/sst/pull/3076) [`f1249013d`](https://github.com/serverless-stack/sst/commit/f1249013d8476856558d2e6baaf25e55b76523b9) Thanks [@alex-klyuchnikov](https://github.com/alex-klyuchnikov)! - Function: await fs.writeFile for nodejs runtime

## 2.18.3

### Patch Changes

- [`dd8ec0191`](https://github.com/serverless-stack/sst/commit/dd8ec0191947314b5b4a07cb8514cbba594a5022) Thanks [@fwang](https://github.com/fwang)! - Fix type file is incomplete

## 2.18.2

### Patch Changes

- [#3055](https://github.com/serverless-stack/sst/pull/3055) [`c1d4fe461`](https://github.com/serverless-stack/sst/commit/c1d4fe461a3534365f22e07b48c97e5c4067ba77) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Remove deprecated rds engine

- [`eebe301c3`](https://github.com/serverless-stack/sst/commit/eebe301c3e0879b87fa58be5c04b8de6922afaf6) Thanks [@thdxr](https://github.com/thdxr)! - cli: fix issue where function invocation when cli starts crashes the whole thing

- [`e2015c456`](https://github.com/serverless-stack/sst/commit/e2015c4569d53e68e52a65abb7b031fdb4b53abb) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix static assets CloudFront distribution path

## 2.18.1

### Patch Changes

- [`150680d80`](https://github.com/serverless-stack/sst/commit/150680d80733dd85eed26407b647b2440188b8a0) Thanks [@fwang](https://github.com/fwang)! - SsrSite: add static file cache behaviors lazily

- [#3056](https://github.com/serverless-stack/sst/pull/3056) [`06ccb9a9c`](https://github.com/serverless-stack/sst/commit/06ccb9a9c52c408d08ddb50ab64902eed8153d3d) Thanks [@khuezy](https://github.com/khuezy)! - SsrSite: fix s3 assets not setting cache-control

- [`5fff7262d`](https://github.com/serverless-stack/sst/commit/5fff7262d982cd2b791e523930444ae22a7983d0) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix "sst dev" access denied error

## 2.18.0

### Minor Changes

- [`7c71978fa`](https://github.com/serverless-stack/sst/commit/7c71978fa1cd461c6a192a7385c3ca26afbbfdf1) Thanks [@fwang](https://github.com/fwang)! - SsrSite: set cookie behavior to NONE in server cache policy

### Patch Changes

- [`e5fc4de81`](https://github.com/serverless-stack/sst/commit/e5fc4de81b640be37d76862f52aa54d9259fee0b) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: update to OpenNext 2.0.3

- [#3051](https://github.com/serverless-stack/sst/pull/3051) [`2b824b13e`](https://github.com/serverless-stack/sst/commit/2b824b13e4a7a7ffc5864b2e43511ab26e3fd0cb) Thanks [@khuezy](https://github.com/khuezy)! - SsrSite: fix s3 assets cache-control header not set

- [#3054](https://github.com/serverless-stack/sst/pull/3054) [`966d3b0d3`](https://github.com/serverless-stack/sst/commit/966d3b0d3adf367c5416277b8e5c63183f1f1954) Thanks [@berenddeboer](https://github.com/berenddeboer)! - Function: support java17 runtime

- [`a734123f7`](https://github.com/serverless-stack/sst/commit/a734123f718ef12b95834928c14d29e564933bcc) Thanks [@fwang](https://github.com/fwang)! - StaticSite & SsrSite: lazy build

## 2.17.8

### Patch Changes

- [`26afb063c`](https://github.com/serverless-stack/sst/commit/26afb063c0ddd8cbb1fdfe73b955e21ae831da9a) Thanks [@thdxr](https://github.com/thdxr)! - eventbux: fix issue adding two subscribers to the same event

- [`b07a079be`](https://github.com/serverless-stack/sst/commit/b07a079be18c7585a968f5f3789bc3c3909fefeb) Thanks [@thdxr](https://github.com/thdxr)! - kysely: upgrade kysely

## 2.17.7

### Patch Changes

- [#3035](https://github.com/serverless-stack/sst/pull/3035) [`21669e1c7`](https://github.com/serverless-stack/sst/commit/21669e1c72b4910de47c983503cbfe92c100c415) Thanks [@berenddeboer](https://github.com/berenddeboer)! - RDS: grant KMS permission if secret is encrypted with custom KMS key

## 2.17.6

### Patch Changes

- [`f3ab3b8bc`](https://github.com/serverless-stack/sst/commit/f3ab3b8bc1c1bff87210cc3ce77ce5c4cec8fcd7) Thanks [@thdxr](https://github.com/thdxr)! - future/auth: keep claims and code in same state to avoid hijacking

## 2.17.5

### Patch Changes

- [`6a4910dae`](https://github.com/serverless-stack/sst/commit/6a4910dae23cfdbc473a29d80edea6fe885bf200) Thanks [@thdxr](https://github.com/thdxr)! - eventbus: fix bug not respecting max retry setting

## 2.17.4

### Patch Changes

- [`258497590`](https://github.com/serverless-stack/sst/commit/258497590c76a8a91b0673f3e7a0439d2099d774) Thanks [@thdxr](https://github.com/thdxr)! - eventbus: simplify retry algorithm

## 2.17.3

### Patch Changes

- [#3032](https://github.com/serverless-stack/sst/pull/3032) [`ef61e7db6`](https://github.com/serverless-stack/sst/commit/ef61e7db67760c9bcc9fa92fa23ea936f9517ddc) Thanks [@berenddeboer](https://github.com/berenddeboer)! - Bucket: enforce S3 https connections

- [#3036](https://github.com/serverless-stack/sst/pull/3036) [`48f27bcbb`](https://github.com/serverless-stack/sst/commit/48f27bcbbb89ef0fcb69d26ddbbe7542fadfa29b) Thanks [@berenddeboer](https://github.com/berenddeboer)! - bootstrap: add lifecyle rule to stop triggering rule S3.13 in Security Hub

## 2.17.2

### Patch Changes

- [#3030](https://github.com/serverless-stack/sst/pull/3030) [`b5a6953cf`](https://github.com/serverless-stack/sst/commit/b5a6953cfc61d71d297a98981307b39ad79c1298) Thanks [@jmnavarr](https://github.com/jmnavarr)! - Use correct custom CDK toolkit stack name

## 2.17.1

## 2.17.0

### Minor Changes

- [#3015](https://github.com/serverless-stack/sst/pull/3015) [`5128f2dd7`](https://github.com/serverless-stack/sst/commit/5128f2dd7533a24b2e6e5ac209552ae519506c25) Thanks [@berenddeboer](https://github.com/berenddeboer)! - Bootstrap: remove use of SQS queue

- [#3015](https://github.com/serverless-stack/sst/pull/3015) [`5128f2dd7`](https://github.com/serverless-stack/sst/commit/5128f2dd7533a24b2e6e5ac209552ae519506c25) Thanks [@berenddeboer](https://github.com/berenddeboer)! - Bootstrap: enforce ssl connections to S3 to stop triggering S3.5 of the AWS Foundational Security Best Practices

### Patch Changes

- [#3024](https://github.com/serverless-stack/sst/pull/3024) [`43e4a0d73`](https://github.com/serverless-stack/sst/commit/43e4a0d73d510e6b59828ca684b9cbb4d1254f7d) Thanks [@ipatka](https://github.com/ipatka)! - Function: fail build when node runtime installation fails

## 2.16.4

### Patch Changes

- [#3025](https://github.com/serverless-stack/sst/pull/3025) [`2ba152041`](https://github.com/serverless-stack/sst/commit/2ba15204194b51a1cf6a12a6594f69eac97d38d7) Thanks [@ealain](https://github.com/ealain)! - NextjsSite: support vpc settings for revalidation function

## 2.16.3

### Patch Changes

- [#3014](https://github.com/serverless-stack/sst/pull/3014) [`af4aa0056`](https://github.com/serverless-stack/sst/commit/af4aa0056290a4323499ae3bf84dc7df12424c33) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: remove failover origin

- [#3010](https://github.com/serverless-stack/sst/pull/3010) [`3e43bc679`](https://github.com/serverless-stack/sst/commit/3e43bc67982bb64a62f7e9614a9df071a49a599a) Thanks [@berenddeboer](https://github.com/berenddeboer)! - fix: use stackName in migrator metadata instead of stack id

## 2.16.2

### Patch Changes

- [#3003](https://github.com/serverless-stack/sst/pull/3003) [`d970a4bbe`](https://github.com/serverless-stack/sst/commit/d970a4bbe6731321d36df96e9e26d1edcf7d7443) Thanks [@clawsl](https://github.com/clawsl)! - arm64 docker build support for Python functions

- [`56b237da1`](https://github.com/serverless-stack/sst/commit/56b237da140ae49d54da97f27fd42978a7110944) Thanks [@fwang](https://github.com/fwang)! - StaticSite: allow setting content type

- [#2998](https://github.com/serverless-stack/sst/pull/2998) [`62ff43063`](https://github.com/serverless-stack/sst/commit/62ff43063c91fdae0a736dc56db06250451bee75) Thanks [@berenddeboer](https://github.com/berenddeboer)! - add --to option to diff to prevent it building to .sst/dist

- [`75a77c6e5`](https://github.com/serverless-stack/sst/commit/75a77c6e53a8c81e9cc4ca960ef6ca92a425985e) Thanks [@fwang](https://github.com/fwang)! - StaticSite: preserver .well-known uri path

## 2.16.1

### Patch Changes

- [`a96dd29b2`](https://github.com/serverless-stack/sst/commit/a96dd29b27a3667027400db061c3144619179675) Thanks [@fwang](https://github.com/fwang)! - Script: run once on "sst dev" boot up

## 2.16.0

### Minor Changes

- [#3001](https://github.com/serverless-stack/sst/pull/3001) [`53fd3cb75`](https://github.com/serverless-stack/sst/commit/53fd3cb757baefc4af9129e8cd4183492d23fae4) Thanks [@fwang](https://github.com/fwang)! - Update CDK to v2.84.0

### Patch Changes

- [#3000](https://github.com/serverless-stack/sst/pull/3000) [`aa36e945e`](https://github.com/serverless-stack/sst/commit/aa36e945eed53bd11eb908100d62b42c305f53e3) Thanks [@iloewensen](https://github.com/iloewensen)! - RDS: grant cloudformation DescribeStacks permission

## 2.15.0

### Minor Changes

- [`1fe0692cd`](https://github.com/serverless-stack/sst/commit/1fe0692cde01e0fda1bca1574f3e37d99512b6bf) Thanks [@thdxr](https://github.com/thdxr)! - future auth: code adapter callback api changed to onCodeRequest and onCodeInvalid

## 2.14.0

### Minor Changes

- [#2764](https://github.com/serverless-stack/sst/pull/2764) [`0c73f55ea`](https://github.com/serverless-stack/sst/commit/0c73f55eab16d5ec1694c6bc0a34b1e9873f6fcb) Thanks [@conico974](https://github.com/conico974)! - NextjsSite: Improved ISR support

## 2.13.9

### Patch Changes

- [`bd83933d6`](https://github.com/serverless-stack/sst/commit/bd83933d697dc21209ed2fbfa86e08484c61d2c5) Thanks [@thdxr](https://github.com/thdxr)! - metadata: include script, job and auth metadata

## 2.13.8

### Patch Changes

- [`4b2a95621`](https://github.com/serverless-stack/sst/commit/4b2a95621b86b06e49668ad79b9912c5640b4f97) Thanks [@thdxr](https://github.com/thdxr)! - context: reset should reset itself as well

## 2.13.7

### Patch Changes

- [`7b1956784`](https://github.com/serverless-stack/sst/commit/7b1956784cf89ab72e4f13c0b4effce31c70166f) Thanks [@thdxr](https://github.com/thdxr)! - allow context to be reset

## 2.13.6

### Patch Changes

- [`468f35520`](https://github.com/serverless-stack/sst/commit/468f355204b17f740bc0c92abb926a9be33e2aea) Thanks [@thdxr](https://github.com/thdxr)! - auth: code adapter handles invalid

## 2.13.5

### Patch Changes

- [`a05a1359d`](https://github.com/serverless-stack/sst/commit/a05a1359db965e555d639bda18a607f2a7924c41) Thanks [@thdxr](https://github.com/thdxr)! - StaticSite: include url in metadata

## 2.13.4

### Patch Changes

- [`4f196437a`](https://github.com/serverless-stack/sst/commit/4f196437a2b123174b812f48c8f2e5ea46fbaae9) Thanks [@thdxr](https://github.com/thdxr)! - site: include url in site metadata

## 2.13.3

### Patch Changes

- [`d8970b0fa`](https://github.com/serverless-stack/sst/commit/d8970b0fa36d6ab461b22af0ecd8d3bddcf3cdf4) Thanks [@fwang](https://github.com/fwang)! - Fix stack synthesizer not respect "cdk" props in sst.config

- [`79f678179`](https://github.com/serverless-stack/sst/commit/79f678179761a455ac463e36f630beaabd13e19e) Thanks [@thdxr](https://github.com/thdxr)! - auth: encryption utilities + code adapter

- [`4d9c70f3b`](https://github.com/serverless-stack/sst/commit/4d9c70f3b874fcf55de5ff9b0eade44e2f48fddf) Thanks [@thdxr](https://github.com/thdxr)! - constructs: metadata updates and fixes

- [`1c8a7a39c`](https://github.com/serverless-stack/sst/commit/1c8a7a39c97206e5c90cbac93858c5bf7b2bf6a6) Thanks [@fwang](https://github.com/fwang)! - Script: do not run script on rollback

## 2.13.2

### Patch Changes

- [`80bb4f089`](https://github.com/serverless-stack/sst/commit/80bb4f089d0c071ae072be595e531229eaaa04f2) Thanks [@fwang](https://github.com/fwang)! - SsrSite: CloudFront origin timeout respect server lambda timeout

- [`67ee41566`](https://github.com/serverless-stack/sst/commit/67ee4156662325121f4afeaf42dce07ba6ba28c3) Thanks [@fwang](https://github.com/fwang)! - SsrSite: expose cdk.function for edge mode

- [`6dd69d9c7`](https://github.com/serverless-stack/sst/commit/6dd69d9c74a6941dc64fd1c21fd2064f0869eeb9) Thanks [@thdxr](https://github.com/thdxr)! - auth: allow customizing index page

## 2.13.1

### Patch Changes

- [`e77262351`](https://github.com/serverless-stack/sst/commit/e77262351f15fb31073d6b729345f4263bf678b8) Thanks [@thdxr](https://github.com/thdxr)! - eventbus: handle subscriber name too long

## 2.13.0

### Minor Changes

- [#2965](https://github.com/serverless-stack/sst/pull/2965) [`83909ce36`](https://github.com/serverless-stack/sst/commit/83909ce367e6e247a9b25063624ecbbd13bc1260) Thanks [@michaelgmcd](https://github.com/michaelgmcd)! - Support Postgres 13.9

### Patch Changes

- [`4a5eb23e1`](https://github.com/serverless-stack/sst/commit/4a5eb23e117366672a10c4cb88458b914e713d12) Thanks [@thdxr](https://github.com/thdxr)! - remove sigterm trapping

- [`bec587f0b`](https://github.com/serverless-stack/sst/commit/bec587f0bddb766248095414ee116f79e4d14ba2) Thanks [@thdxr](https://github.com/thdxr)! - eventbus: support subscribing to multiple events

## 2.12.2

### Patch Changes

- [`b5d360c68`](https://github.com/serverless-stack/sst/commit/b5d360c68bbc14357d67387672477465970ac3a3) Thanks [@thdxr](https://github.com/thdxr)! - eventbus: support multiple events in subscription

## 2.12.1

## 2.12.0

### Minor Changes

- [`5fa74500d`](https://github.com/serverless-stack/sst/commit/5fa74500d0ae32587372f95510bd7eb1ed31a3e2) Thanks [@thdxr](https://github.com/thdxr)! - Breaking change in future/auth:

  Instead of returning the session directly from `onSuccess` there is now a second paramter passed in called `response`. You can use this to create sessions `return response.session` but can also instead chain other providers or return a normal HTTP response. This comes in handy when creating multi-step auth processes or when connecting external services to an existing account.

## 2.11.18

### Patch Changes

- [#2956](https://github.com/serverless-stack/sst/pull/2956) [`e23457d25`](https://github.com/serverless-stack/sst/commit/e23457d25d867329da93a50bd35d0a6cd1ff805e) Thanks [@fwang](https://github.com/fwang)! - Allow overriding CDK roles in sst.config.ts

## 2.11.17

### Patch Changes

- [`e74f8a350`](https://github.com/serverless-stack/sst/commit/e74f8a350b6439e50be715d53a6e223489f474e1) Thanks [@fwang](https://github.com/fwang)! - Job: exit process in the wrapper function

## 2.11.16

### Patch Changes

- [`14c6bad3b`](https://github.com/serverless-stack/sst/commit/14c6bad3baa60d0a5c79745ce64514d8477d53bd) Thanks [@fwang](https://github.com/fwang)! - RemixSite: host header shows CloudFront domain

## 2.11.15

### Patch Changes

- [`6645002d0`](https://github.com/serverless-stack/sst/commit/6645002d00be8085a4090ccbd86d3b1b1849c3d8) Thanks [@thdxr](https://github.com/thdxr)! - rds: add support for 11.16 postgres

## 2.11.14

### Patch Changes

- [`9fc713a3b`](https://github.com/serverless-stack/sst/commit/9fc713a3b857e33d0d45a861d1cbac1134d5e837) Thanks [@thdxr](https://github.com/thdxr)! - function: add handler path in metadata

## 2.11.13

### Patch Changes

- [`557ab1a19`](https://github.com/serverless-stack/sst/commit/557ab1a191aaefcc016f3a87bbb405a71602c92e) Thanks [@fwang](https://github.com/fwang)! - SsrSite: add support for setting log retention

## 2.11.12

### Patch Changes

- [`0daef8c23`](https://github.com/serverless-stack/sst/commit/0daef8c236d45785cae5f27062500b59044a1cd3) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: pin to OpenNext v1.4.0

## 2.11.11

### Patch Changes

- [`b700ee400`](https://github.com/serverless-stack/sst/commit/b700ee400ba0c4065907949ea78d1446ec4dfe28) Thanks [@thdxr](https://github.com/thdxr)! - fix issue with deploy, diff, and remove

## 2.11.10

### Patch Changes

- [`5fb455ebf`](https://github.com/serverless-stack/sst/commit/5fb455ebfb81ee7e07871662d3c55243cff07d83) Thanks [@thdxr](https://github.com/thdxr)! - fix sst build

## 2.11.9

### Patch Changes

- [`bb1749953`](https://github.com/serverless-stack/sst/commit/bb174995332e4415ec9f527bb198e4d4213ee671) Thanks [@thdxr](https://github.com/thdxr)! - fix retrier not being activated

## 2.11.8

### Patch Changes

- [`d4de7e4b6`](https://github.com/serverless-stack/sst/commit/d4de7e4b668f8e545556f48024cf8fe7432d5f37) Thanks [@thdxr](https://github.com/thdxr)! - regex approach didn't work, had to use ast

## 2.11.7

### Patch Changes

- [`318b9c88f`](https://github.com/serverless-stack/sst/commit/318b9c88f7ecf7e86a0777885225900b5eaf51f0) Thanks [@thdxr](https://github.com/thdxr)! - improve performance of CLI start

## 2.11.6

### Patch Changes

- [`ea7995119`](https://github.com/serverless-stack/sst/commit/ea799511940131893c7e02d6dbc2303a70a3e016) Thanks [@thdxr](https://github.com/thdxr)! - update sst connect command to switch between prod and dev

## 2.11.5

### Patch Changes

- [`99704f9c4`](https://github.com/serverless-stack/sst/commit/99704f9c4dd60d4ebd14bbccaeb945a2a543c805) Thanks [@thdxr](https://github.com/thdxr)! - Fixed eventbusname

## 2.11.4

### Patch Changes

- [#2883](https://github.com/serverless-stack/sst/pull/2883) [`393cdfcb2`](https://github.com/serverless-stack/sst/commit/393cdfcb2d754482c7ea78fc6274c4d87b04aa23) Thanks [@justindra](https://github.com/justindra)! - Added SpotifyAdapter for future auth

## 2.11.3

### Patch Changes

- [`1017fe643`](https://github.com/serverless-stack/sst/commit/1017fe64396cfb3eb5a52124898c01cb0a15b5fb) Thanks [@thdxr](https://github.com/thdxr)! - Typesafe event framework

## 2.11.2

### Patch Changes

- [`09cdb39e9`](https://github.com/serverless-stack/sst/commit/09cdb39e94fa3e52f6ae3d47f81bdc54389cac2b) Thanks [@thdxr](https://github.com/thdxr)! - Add retrier capability to eventbus

## 2.11.1

### Patch Changes

- [`20e275619`](https://github.com/serverless-stack/sst/commit/20e2756196e09414e38d58dc058b80e739f65657) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: allow using sst bind at build time

- [`b2b07471b`](https://github.com/serverless-stack/sst/commit/b2b07471b5568e93353cb68c1ed05f225513bf3b) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: fix pinning to the latest minor version

- [`08a9d15ef`](https://github.com/serverless-stack/sst/commit/08a9d15efe723cf34bb61bedb9b5ce786305a8a3) Thanks [@fwang](https://github.com/fwang)! - sst bind: support --site and --script options to override mode

## 2.11.0

### Minor Changes

- [#2909](https://github.com/serverless-stack/sst/pull/2909) [`2f8b14b02`](https://github.com/serverless-stack/sst/commit/2f8b14b02104b3e1503253b1ee4f84ba2c60db2b) Thanks [@archieedwards](https://github.com/archieedwards)! - future/auth: add prompt support for oidc

- [#2917](https://github.com/serverless-stack/sst/pull/2917) [`6e4099d5e`](https://github.com/serverless-stack/sst/commit/6e4099d5e59dcec03515d3e197573be887f8c735) Thanks [@archieedwards](https://github.com/archieedwards)! - future/auth - forward query params to authorization endpoint

### Patch Changes

- [#2915](https://github.com/serverless-stack/sst/pull/2915) [`4ce2a9d12`](https://github.com/serverless-stack/sst/commit/4ce2a9d12890e1751daa6f3eecce4d165f1d1877) Thanks [@digitaltoad](https://github.com/digitaltoad)! - Allow filtering secrets by fallback values

- [`b603961f0`](https://github.com/serverless-stack/sst/commit/b603961f052fb5da18d1112c4f86469aaae19d66) Thanks [@thdxr](https://github.com/thdxr)! - fix migrations breaking when js is in the path name

- [#2916](https://github.com/serverless-stack/sst/pull/2916) [`fdcb548a1`](https://github.com/serverless-stack/sst/commit/fdcb548a1cac3ba02fb4b5021515e83afb713b02) Thanks [@justindra](https://github.com/justindra)! - Fix the missing padding due to color in secrets list

## 2.10.4

### Patch Changes

- [`b4366a240`](https://github.com/serverless-stack/sst/commit/b4366a240b831a0685e485c521a6b43d8cec7ffd) Thanks [@fwang](https://github.com/fwang)! - sst/node: improve error message when SST_APP is not found

## 2.10.3

### Patch Changes

- [`6203bdfe7`](https://github.com/serverless-stack/sst/commit/6203bdfe73feac4df0a6079de70c97d98a3293b2) Thanks [@thdxr](https://github.com/thdxr)! - Fix unhandled promise rejections from crashing the app

## 2.10.2

### Patch Changes

- [`0c4894a3f`](https://github.com/serverless-stack/sst/commit/0c4894a3f88e9d83430b7aed125efa240cd82a5a) Thanks [@fwang](https://github.com/fwang)! - SsrSite: allow overriding response header policy

## 2.10.1

### Patch Changes

- [`b87a96ffe`](https://github.com/serverless-stack/sst/commit/b87a96ffe2fb9d62754d025b0c950beec701d068) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: use 1.3.x instead of ~1.3.0 to pin minor OpenNext versions

## 2.10.0

### Minor Changes

- [`2b0c6760f`](https://github.com/serverless-stack/sst/commit/2b0c6760f4fcd2cbf8a3b62181b20e0615f6b31c) Thanks [@fwang](https://github.com/fwang)! - Update CDK to v2.79.1

## 2.9.0

### Minor Changes

- [#2902](https://github.com/serverless-stack/sst/pull/2902) [`e120a6c00`](https://github.com/serverless-stack/sst/commit/e120a6c0072c4be843a4686c68e2a429a5fb72cb) Thanks [@zvictor](https://github.com/zvictor)! - Add support for JSON format in secrets list

## 2.8.29

## 2.8.28

### Patch Changes

- [`f7f4a6ffc`](https://github.com/serverless-stack/sst/commit/f7f4a6ffc3c150a8f2e09e9d2136b5669b675fcd) Thanks [@thdxr](https://github.com/thdxr)! - fix job construct path problems when deployed from windows

## 2.8.27

### Patch Changes

- [`7fb657e0e`](https://github.com/serverless-stack/sst/commit/7fb657e0ea08cfdabe4fec2577bf8cd71d7f4e9a) Thanks [@thdxr](https://github.com/thdxr)! - fix connect command by including iam client

## 2.8.26

### Patch Changes

- [`7935511eb`](https://github.com/serverless-stack/sst/commit/7935511eba607294c7953c2afb9fa03270ac252b) Thanks [@thdxr](https://github.com/thdxr)! - sst update fix for svelte-kit-sst

## 2.8.25

### Patch Changes

- [`e0522a7b4`](https://github.com/serverless-stack/sst/commit/e0522a7b47c8af340b504da927348c443ee75d58) Thanks [@thdxr](https://github.com/thdxr)! - automatically set graphql endpoint if not manually set

## 2.8.24

### Patch Changes

- [#2817](https://github.com/serverless-stack/sst/pull/2817) [`2aec504bf`](https://github.com/serverless-stack/sst/commit/2aec504bfd5145d36c510171af207dbeca682e5f) Thanks [@justindra](https://github.com/justindra)! - Updated the function binding to include httpsUrl as that is required to send messages using the ApiGateway client

- [#2817](https://github.com/serverless-stack/sst/pull/2817) [`2aec504bf`](https://github.com/serverless-stack/sst/commit/2aec504bfd5145d36c510171af207dbeca682e5f) Thanks [@justindra](https://github.com/justindra)! - Added WebSocketApiHandler so that we can use the auth sessions inside of a WebSocket's connect and disconnect requests

- [#2817](https://github.com/serverless-stack/sst/pull/2817) [`2aec504bf`](https://github.com/serverless-stack/sst/commit/2aec504bfd5145d36c510171af207dbeca682e5f) Thanks [@justindra](https://github.com/justindra)! - Added a new WebSocketApiHandler to allow for websockets to use session hooks

- [`a8444e766`](https://github.com/serverless-stack/sst/commit/a8444e76607256fc8428b376647d2d15887ee370) Thanks [@thdxr](https://github.com/thdxr)! - fix: job construct erroring when timeout set to greater than 15min

- [#2879](https://github.com/serverless-stack/sst/pull/2879) [`5a8e115ff`](https://github.com/serverless-stack/sst/commit/5a8e115ffdb48bbc0177ef9261f48bdc3b376cb7) Thanks [@estyrke](https://github.com/estyrke)! - Replace zip-local package with adm-zip

- [#2889](https://github.com/serverless-stack/sst/pull/2889) [`78cbdd721`](https://github.com/serverless-stack/sst/commit/78cbdd721429b505daf0360d2698cdac74166c10) Thanks [@mvanleest](https://github.com/mvanleest)! - future/auth: Added Microsoft adapter

- [`522449fbd`](https://github.com/serverless-stack/sst/commit/522449fbde65cca9aa02ddd6ae503e85f68a5b8a) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support warmer

## 2.8.23

### Patch Changes

- [`c590bf380`](https://github.com/serverless-stack/sst/commit/c590bf380bffd51f1625de1f0bc408d573438c8c) Thanks [@fwang](https://github.com/fwang)! - SvelteKitSite: construct function handler in posix format

- [#2880](https://github.com/serverless-stack/sst/pull/2880) [`1f6af6a20`](https://github.com/serverless-stack/sst/commit/1f6af6a20c5f34d649e4d685f817f652dca9492b) Thanks [@tyrauber](https://github.com/tyrauber)! - SsrSite: merge user defined CloudFront function definitions

## 2.8.22

## 2.8.21

### Patch Changes

- [`ee5339521`](https://github.com/serverless-stack/sst/commit/ee53395212a045584fa97bac7f77ea8cb5674458) Thanks [@thdxr](https://github.com/thdxr)! - Temporary fix for DNS issue when fetching metadata

- [#2878](https://github.com/serverless-stack/sst/pull/2878) [`848ae7fdd`](https://github.com/serverless-stack/sst/commit/848ae7fdd42b3f80fe5854ec2f28b794bc6ea45a) Thanks [@jamesgibbons92](https://github.com/jamesgibbons92)! - Cli: do not remove config files created by concurrent SST processes

- [`73cff4132`](https://github.com/serverless-stack/sst/commit/73cff4132ec2787ecc27b3eeb8607f5d716d6521) Thanks [@fwang](https://github.com/fwang)! - Job: use posix import path on Windows

## 2.8.20

### Patch Changes

- [`78e25f4ad`](https://github.com/serverless-stack/sst/commit/78e25f4addf5d0ce1eebeb452ce791a0773add9f) Thanks [@fwang](https://github.com/fwang)! - Job: apply nodejs options to local invoker

## 2.8.19

### Patch Changes

- [`0517859dd`](https://github.com/serverless-stack/sst/commit/0517859dd87794bbdc374ef4d0abd6f7558be323) Thanks [@thdxr](https://github.com/thdxr)! - Add copyFile support to sst.Job

## 2.8.18

## 2.8.17

### Patch Changes

- [#2835](https://github.com/serverless-stack/sst/pull/2835) [`ed60bd35a`](https://github.com/serverless-stack/sst/commit/ed60bd35add0cc7e88f769ef6a4e4179cb73c62b) Thanks [@danestves](https://github.com/danestves)! - RemixSite: update RemixConfig to prep for Remix v2

## 2.8.16

### Patch Changes

- [`a14a16acb`](https://github.com/serverless-stack/sst/commit/a14a16acb5fa4cd74b515b653d3670af20a2fc62) Thanks [@thdxr](https://github.com/thdxr)! - Upgrade kysely-data-api

## 2.8.15

## 2.8.14

## 2.8.13

### Patch Changes

- [`c15bf9aac`](https://github.com/serverless-stack/sst/commit/c15bf9aac359cd5e66b4e940df0c3d15cd644d43) Thanks [@fwang](https://github.com/fwang)! - Script: add "version" prop to control when the script runs

- [`b42de5112`](https://github.com/serverless-stack/sst/commit/b42de51122483bbf7069b370982f242794965776) Thanks [@fwang](https://github.com/fwang)! - Add option to disable parameterized stack name check

- [#2775](https://github.com/serverless-stack/sst/pull/2775) [`b6d2300d4`](https://github.com/serverless-stack/sst/commit/b6d2300d46c813a6500d131d887f849de39f2403) Thanks [@aphex](https://github.com/aphex)! - Sites: add ability to set site url in "sst dev" mode

## 2.8.12

### Patch Changes

- [`c3e5acdc3`](https://github.com/serverless-stack/sst/commit/c3e5acdc3758a1f8b008206323b8dbb45ea704d0) Thanks [@fwang](https://github.com/fwang)! - SvelteKitSite: update adapter output destination

## 2.8.11

### Patch Changes

- [`ae4af45db`](https://github.com/serverless-stack/sst/commit/ae4af45db4dbeb8a850161c32ba446577e11370e) Thanks [@fwang](https://github.com/fwang)! - SvelteKitSite: set "SST" build time environment variable

- [`21d49d5a4`](https://github.com/serverless-stack/sst/commit/21d49d5a4fd711e6322415da7b9bb8ed5f4a0de8) Thanks [@fwang](https://github.com/fwang)! - Job: show build errors on build failure

## 2.8.10

### Patch Changes

- [`b85fe2ed1`](https://github.com/serverless-stack/sst/commit/b85fe2ed1d96b45420f935281e0eac025648b3f3) Thanks [@fwang](https://github.com/fwang)! - Bucket: set default options to allow public ACLs and enable CORS

## 2.8.9

### Patch Changes

- [`f29249879`](https://github.com/serverless-stack/sst/commit/f29249879ccf9fd30c79f66d07419eec74ace3be) Thanks [@fwang](https://github.com/fwang)! - Bucket: set default options to allow public access and enable CORS

## 2.8.8

### Patch Changes

- [#2348](https://github.com/serverless-stack/sst/pull/2348) [`9a2142bba`](https://github.com/serverless-stack/sst/commit/9a2142bba0322be32e8d7cb0045c23b256672eb3) Thanks [@hoangnd25](https://github.com/hoangnd25)! - StaticSite: support importing existing CloudFront distribution

- [#2812](https://github.com/serverless-stack/sst/pull/2812) [`9dae0be56`](https://github.com/serverless-stack/sst/commit/9dae0be565729d3be3122f1b4ebdc0199e1b44cc) Thanks [@jlanzarotti](https://github.com/jlanzarotti)! - Cognito: expose cfnIdentityPoolRoleAttachment prop

- [#2849](https://github.com/serverless-stack/sst/pull/2849) [`2e71c9726`](https://github.com/serverless-stack/sst/commit/2e71c97269b8ccac612cf9b93a20186be3e357e5) Thanks [@danecwalker](https://github.com/danecwalker)! - SsrSite: Fix dev server role cannot be assumed by Lambda

## 2.8.7

### Patch Changes

- [`69662a713`](https://github.com/serverless-stack/sst/commit/69662a7132fcb4316547333b260714ee6880af4e) Thanks [@fwang](https://github.com/fwang)! - SsrSite: allow principles from the same AWS account to assume the dev role

## 2.8.6

### Patch Changes

- [#2831](https://github.com/serverless-stack/sst/pull/2831) [`ce5ce44c8`](https://github.com/serverless-stack/sst/commit/ce5ce44c8491eb7021288356f90e47681e0f5cb9) Thanks [@estyrke](https://github.com/estyrke)! - Allow packages to be marked as "internal" for Pothos extractor

- [#2837](https://github.com/serverless-stack/sst/pull/2837) [`8a684c5a9`](https://github.com/serverless-stack/sst/commit/8a684c5a96e2e17e8a2b42a5666db10946f6fdf6) Thanks [@deb-oliveira](https://github.com/deb-oliveira)! - [Fix/Dotnet]: enable the selection of dotnet6 bootstrap and secure input.out with quotes

- [#2831](https://github.com/serverless-stack/sst/pull/2831) [`ce5ce44c8`](https://github.com/serverless-stack/sst/commit/ce5ce44c8491eb7021288356f90e47681e0f5cb9) Thanks [@estyrke](https://github.com/estyrke)! - Allow for Pothos extractor to consider some packages as "internal"

- [`d54d31884`](https://github.com/serverless-stack/sst/commit/d54d31884b5a10c7a7e133e29ea49e4f8863954b) Thanks [@thdxr](https://github.com/thdxr)! - upgrade kysely-codegen

## 2.8.5

### Patch Changes

- [`f0dbf9c84`](https://github.com/serverless-stack/sst/commit/f0dbf9c84785049c529c2215093a8a84f51bb6db) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: use OpenNext v1.2.x

- [`5debc11a7`](https://github.com/serverless-stack/sst/commit/5debc11a7f0b4af68c50c716adf3e1ab968605bf) Thanks [@fwang](https://github.com/fwang)! - Sites: fix files not uploaded to s3

## 2.8.4

### Patch Changes

- [`c3c712bb1`](https://github.com/serverless-stack/sst/commit/c3c712bb1e19633fc6040fabd499a5d881f9d165) Thanks [@thdxr](https://github.com/thdxr)! - fixed issue with job data not loading correctly

## 2.8.3

### Patch Changes

- [`ac7622928`](https://github.com/serverless-stack/sst/commit/ac7622928998c438f4645f38bef6a038b309b061) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: add "accpet", "rsc", and state tree headers to cache policy

## 2.8.2

### Patch Changes

- [`f239e3292`](https://github.com/serverless-stack/sst/commit/f239e3292b6a379c20472717574120c470ba0b55) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix dev mode placeholder function path

## 2.8.1

### Patch Changes

- [`6cd6c2d1e`](https://github.com/serverless-stack/sst/commit/6cd6c2d1eae10979fabdfad6912e61a3c7211e3f) Thanks [@fwang](https://github.com/fwang)! - Add support for SvelteKit

## 2.8.0

### Minor Changes

- [#2824](https://github.com/serverless-stack/sst/pull/2824) [`eebce13c1`](https://github.com/serverless-stack/sst/commit/eebce13c18cb51f2fd6ead53492ed5d8fc375040) Thanks [@fwang](https://github.com/fwang)! - Add support for SvelteKit

### Patch Changes

- [`986f01505`](https://github.com/serverless-stack/sst/commit/986f015058f9e314f166b3277d9961356fa9e05a) Thanks [@fwang](https://github.com/fwang)! - SsrSite: server function do not inherit default function props

- [`42ab9acbe`](https://github.com/serverless-stack/sst/commit/42ab9acbee06ade79774c2d1b3f58a78e2f62a7f) Thanks [@fwang](https://github.com/fwang)! - Function: handle Rate Exceeded error setting log retention

## 2.7.2

### Patch Changes

- [`17314466a`](https://github.com/serverless-stack/sst/commit/17314466aaf4f72c23ba28d50a35cfbdc3a3ee45) Thanks [@thdxr](https://github.com/thdxr)! - Gracefully handle dangling invocations

- [`d7e469c93`](https://github.com/serverless-stack/sst/commit/d7e469c934971926edbbebcc27411c11e0a13202) Thanks [@fwang](https://github.com/fwang)! - sst deploy: do not prompt mode change in CI environment

- [`179483f6c`](https://github.com/serverless-stack/sst/commit/179483f6c1dc5a7e0885d0f793429badfa188d5b) Thanks [@fwang](https://github.com/fwang)! - Function: remove hardcoding ARN partition to "aws"

- [#2805](https://github.com/serverless-stack/sst/pull/2805) [`4713910a3`](https://github.com/serverless-stack/sst/commit/4713910a3afd1958ee8e47259959704d644a23c7) Thanks [@theodiablo](https://github.com/theodiablo)! - deprecated/NextjsSite: fix custom resource import path

- [`8cd24268f`](https://github.com/serverless-stack/sst/commit/8cd24268f415a0d862e9ab6db5c711970e1f9172) Thanks [@fwang](https://github.com/fwang)! - sst diff: handle new stacks added

- [`514cd63f9`](https://github.com/serverless-stack/sst/commit/514cd63f9ff102b275b2833f0581741ead9547ce) Thanks [@fwang](https://github.com/fwang)! - AppSyncApi: support using A/AAAA record for custom domain

## 2.7.1

### Patch Changes

- [`74395668f`](https://github.com/serverless-stack/sst/commit/74395668f1533b3f06777b5394990932f497cf91) Thanks [@thdxr](https://github.com/thdxr)! - Fix issue with root Auth route

## 2.7.0

### Minor Changes

- [#2792](https://github.com/serverless-stack/sst/pull/2792) [`4983573a3`](https://github.com/serverless-stack/sst/commit/4983573a35f47503d83ed1d7aa108d65ce6ccd9e) Thanks [@estyrke](https://github.com/estyrke)! - Small fixes to future/auth

## 2.6.0

### Minor Changes

- [`19fa6919c`](https://github.com/serverless-stack/sst/commit/19fa6919cdca5148c70d8aa3562675f1ae0e7830) Thanks [@thdxr](https://github.com/thdxr)! - Remove side-effects from node package for more granular bundling

### Patch Changes

- [#2784](https://github.com/serverless-stack/sst/pull/2784) [`b08bd7ba9`](https://github.com/serverless-stack/sst/commit/b08bd7ba9acf2be25d248eb951dad46adeb86df0) Thanks [@michaelgmcd](https://github.com/michaelgmcd)! - GraphQLHandler: replace graphql-helix with graphql-yoga

## 2.5.8

### Patch Changes

- [`d4671b05c`](https://github.com/serverless-stack/sst/commit/d4671b05caf089a8a48fc13bdf9e096c763a798a) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support OpenNext 1.1.0

- [#2544](https://github.com/serverless-stack/sst/pull/2544) [`3b5263753`](https://github.com/serverless-stack/sst/commit/3b52637532ed610d41cc80a83cbe8e250b07614c) Thanks [@andynaguyen](https://github.com/andynaguyen)! - sst secrets: load secrets from .env files

- [`d4671b05c`](https://github.com/serverless-stack/sst/commit/d4671b05caf089a8a48fc13bdf9e096c763a798a) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: set "x-forwarded-host" header in CF function

## 2.5.7

### Patch Changes

- [`e8bf6d127`](https://github.com/serverless-stack/sst/commit/e8bf6d127f8e84953e5ec21a1c4e1f26d391bfd0) Thanks [@fwang](https://github.com/fwang)! - sst bind: kill entire process tree on restart

- [`5203cccd1`](https://github.com/serverless-stack/sst/commit/5203cccd1d2c138c00af8d6d277075497a1d01f9) Thanks [@fwang](https://github.com/fwang)! - Retry AWS SDK calls on interrupted internet connection

## 2.5.6

### Patch Changes

- [`0636496a2`](https://github.com/serverless-stack/sst/commit/0636496a287b61bde5f4af5874a7fb547c3a9364) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix sst dev error when enableLiveDev is set to false

- [`1e7c32887`](https://github.com/serverless-stack/sst/commit/1e7c328877e8d4fc0cd3561c6e2b172266ab2820) Thanks [@fwang](https://github.com/fwang)! - SsrSite: fix permissions not attached to placeholder server function

- [`2f16a73da`](https://github.com/serverless-stack/sst/commit/2f16a73daf77c800dc2b65bb2ebfe4d29a0e76fb) Thanks [@fwang](https://github.com/fwang)! - sst secrets: fix ssmPrefix is not respected

- [`5cd2d4fde`](https://github.com/serverless-stack/sst/commit/5cd2d4fded67969e6dd6befd125d3c6f402dd0d8) Thanks [@fwang](https://github.com/fwang)! - Sanitize stage names with invalid characters

## 2.5.5

### Patch Changes

- [`b22686bba`](https://github.com/serverless-stack/sst/commit/b22686bba1fba9abb00d536e2d8ed48fe6d7170a) Thanks [@fwang](https://github.com/fwang)! - sst bind: handle old stack metadata

- [`42c6b5f14`](https://github.com/serverless-stack/sst/commit/42c6b5f14d3f6734948e51c6a1d3420cf1650111) Thanks [@fwang](https://github.com/fwang)! - sst version: print constructs version

- [`fe6103a40`](https://github.com/serverless-stack/sst/commit/fe6103a406d17384c422469c9298f7b60a4c6c83) Thanks [@fwang](https://github.com/fwang)! - Job: support vps security groups and subnet selection

## 2.5.4

### Patch Changes

- [#2780](https://github.com/serverless-stack/sst/pull/2780) [`ea7e565fe`](https://github.com/serverless-stack/sst/commit/ea7e565fee7c7b8d08eb08339f1a0d15636132cd) Thanks [@Bhavikpatel576](https://github.com/Bhavikpatel576)! - Disable Introspection in GraphQL Helix

- [`7bb418200`](https://github.com/serverless-stack/sst/commit/7bb4182009dfabe6b0cfa93b332bd7c4f54d5dbc) Thanks [@fwang](https://github.com/fwang)! - ApiGatewayV1Api: support binding imported API

- [`01d40bf3a`](https://github.com/serverless-stack/sst/commit/01d40bf3a89fb9ad1c318f96fed0ee409c599224) Thanks [@thdxr](https://github.com/thdxr)! - Handle symlink errors

- [`9b4593bf1`](https://github.com/serverless-stack/sst/commit/9b4593bf1def9be46da941881b232ef39ae2fc21) Thanks [@thdxr](https://github.com/thdxr)! - Fix error with top level URL in banner

## 2.5.3

### Patch Changes

- [`4fc2a79d3`](https://github.com/serverless-stack/sst/commit/4fc2a79d3da9aa905ab77ee0ee44da0e93e8eb08) Thanks [@thdxr](https://github.com/thdxr)! - More restrictive s3 permissions for dev functions

- [`b78571ccd`](https://github.com/serverless-stack/sst/commit/b78571ccda247986aeb3f04715dac3f508b842aa) Thanks [@thdxr](https://github.com/thdxr)! - Make sure function build events are printed

- [#2758](https://github.com/serverless-stack/sst/pull/2758) [`1e9dd488d`](https://github.com/serverless-stack/sst/commit/1e9dd488d872762e27f5832f1728454f9bb38568) Thanks [@jensonb](https://github.com/jensonb)! - Reduced IOT message chunk size to fix Live Lambda bug (#2723)

- [`9d97ab8d7`](https://github.com/serverless-stack/sst/commit/9d97ab8d7e2bbcc306ef24935ad6dea22a5e9448) Thanks [@thdxr](https://github.com/thdxr)! - Cleanup hanging .sst.config files

- [`9d97ab8d7`](https://github.com/serverless-stack/sst/commit/9d97ab8d7e2bbcc306ef24935ad6dea22a5e9448) Thanks [@thdxr](https://github.com/thdxr)! - Properly ignore telemetry errors

## 2.5.2

### Patch Changes

- [`d7729bbbb`](https://github.com/serverless-stack/sst/commit/d7729bbbbe5ba50d6585d28a37ff0392c558b9d8) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support 404 pages

- [#2759](https://github.com/serverless-stack/sst/pull/2759) [`372ff2deb`](https://github.com/serverless-stack/sst/commit/372ff2deb7a8368f427318a67bd2e12d17cd59d5) Thanks [@kevinggrimm](https://github.com/kevinggrimm)! - Add support for relative python imports

## 2.5.1

## 2.5.0

### Minor Changes

- [#2755](https://github.com/serverless-stack/sst/pull/2755) [`5d206930e`](https://github.com/serverless-stack/sst/commit/5d206930ef832a0a1b2fb7956239d74e03f8ff30) Thanks [@fwang](https://github.com/fwang)! - Update CDK to 2.72.1

## 2.4.3

### Patch Changes

- [`399c99f62`](https://github.com/serverless-stack/sst/commit/399c99f621532c9f8cb241f0cbe34f9bf202985e) Thanks [@thdxr](https://github.com/thdxr)! - Fix empty output on sst diff

## 2.4.2

### Patch Changes

- [#2721](https://github.com/serverless-stack/sst/pull/2721) [`6ef0bb4be`](https://github.com/serverless-stack/sst/commit/6ef0bb4be6dfdbf2ada7aa7c702010af2e2fa777) Thanks [@tmianhill](https://github.com/tmianhill)! - fix go build for Win32 #2719

- [`def4665db`](https://github.com/serverless-stack/sst/commit/def4665db960a67e5cfd32115922c2bf36fdbb51) Thanks [@thdxr](https://github.com/thdxr)! - More kysely codegen logs

## 2.4.1

### Patch Changes

- [`5dfe3f7f5`](https://github.com/serverless-stack/sst/commit/5dfe3f7f54b191860f1de366df1a6bd23c33891d) Thanks [@fwang](https://github.com/fwang)! - sst/node: distinguish between secrets not set vs not found

- [#2731](https://github.com/serverless-stack/sst/pull/2731) [`563ca24c3`](https://github.com/serverless-stack/sst/commit/563ca24c3dfa0d531c895bd03f5db948678d9911) Thanks [@khuezy](https://github.com/khuezy)! - sst/node: top level await without assignment build error

- [`bdbcce1e1`](https://github.com/serverless-stack/sst/commit/bdbcce1e1bcb699c318cddb7f6808ce61fcbcd66) Thanks [@fwang](https://github.com/fwang)! - sst bind: add strict checking for solid-start in vite.config

- [#2740](https://github.com/serverless-stack/sst/pull/2740) [`79b84a1cf`](https://github.com/serverless-stack/sst/commit/79b84a1cf54d7e36dc4bf7708bba0ad6e04498b3) Thanks [@Brian-Azizi](https://github.com/Brian-Azizi)! - NextjsSite: pin minor OpenNext version

## 2.4.0

### Minor Changes

- [#2736](https://github.com/serverless-stack/sst/pull/2736) [`8ff508f44`](https://github.com/serverless-stack/sst/commit/8ff508f448ae1e54e39c22c90424b85bb42c253d) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support OpenNext v0.8.0

- [#2736](https://github.com/serverless-stack/sst/pull/2736) [`8ff508f44`](https://github.com/serverless-stack/sst/commit/8ff508f448ae1e54e39c22c90424b85bb42c253d) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support edge mode

## 2.3.7

### Patch Changes

- [#2730](https://github.com/serverless-stack/sst/pull/2730) [`80312d49c`](https://github.com/serverless-stack/sst/commit/80312d49c6cc62a4f03dcab5f4e57259eb1ba5ef) Thanks [@justindra](https://github.com/justindra)! - Added Facebook Adapter into future auth

- [`25ea7eff8`](https://github.com/serverless-stack/sst/commit/25ea7eff864e89fb14fbe0f3763bad959eae6ad5) Thanks [@thdxr](https://github.com/thdxr)! - Export issue from auth

## 2.3.6

### Patch Changes

- [`d928120d2`](https://github.com/serverless-stack/sst/commit/d928120d272fdce39376a9362d5a2b00085e7f6e) Thanks [@fwang](https://github.com/fwang)! - sst bind: set correct exit code

## 2.3.5

## 2.3.4

### Patch Changes

- [`4318b5c72`](https://github.com/serverless-stack/sst/commit/4318b5c727c4341073edab8da5009de031aaf324) Thanks [@fwang](https://github.com/fwang)! - sst bind: handle chained roles has max session duration of 1hr

## 2.3.3

### Patch Changes

- [`36fcf1cb8`](https://github.com/serverless-stack/sst/commit/36fcf1cb8c64a0311bc0751b842c62cd3595634c) Thanks [@thdxr](https://github.com/thdxr)! - File watcher should ignore git folder

## 2.3.2

### Patch Changes

- [`2a5eb1893`](https://github.com/serverless-stack/sst/commit/2a5eb1893377821d2bd25a83ee374df784266b05) Thanks [@fwang](https://github.com/fwang)! - CLI: update primary color to distinguish from error red

- [`73fc2fa6f`](https://github.com/serverless-stack/sst/commit/73fc2fa6f953ac3575a6755058b11622f8cdae06) Thanks [@fwang](https://github.com/fwang)! - bootstrap: support setting custom permissions boundary

- [#2710](https://github.com/serverless-stack/sst/pull/2710) [`6f59768f6`](https://github.com/serverless-stack/sst/commit/6f59768f6dee24d6d82ae67c993ba9a3ebbb3058) Thanks [@fwang](https://github.com/fwang)! - sst bind: fix command not exiting

- [`a2bb76f1c`](https://github.com/serverless-stack/sst/commit/a2bb76f1c6db138f6823837232fa4029ea2a9a55) Thanks [@fwang](https://github.com/fwang)! - AppSyncApi: support OpenSource data source

- [`6e3ae2054`](https://github.com/serverless-stack/sst/commit/6e3ae2054d945897da05e34d9663dc08340f7d42) Thanks [@fwang](https://github.com/fwang)! - Stack: ignore instead of throw on undefined stack output value

- [`c40be2c74`](https://github.com/serverless-stack/sst/commit/c40be2c748f08c00562f9eff4aa683f1f7dd5ca8) Thanks [@fwang](https://github.com/fwang)! - sst dev: print start frontend commands

## 2.3.1

### Patch Changes

- [`2872eb4ac`](https://github.com/serverless-stack/sst/commit/2872eb4ac10a7fc68d20aa8470340ddea43f379f) Thanks [@fwang](https://github.com/fwang)! - deprecated/NextjsSite: fix invalid file path

- [`f4cd2559f`](https://github.com/serverless-stack/sst/commit/f4cd2559f1d373b1dcf0fd22dc9eb8c9253c4c55) Thanks [@thdxr](https://github.com/thdxr)! - Properly throw errors when monitoring stacks fails

## 2.3.0

### Minor Changes

- [#2703](https://github.com/serverless-stack/sst/pull/2703) [`9aa0b7a9f`](https://github.com/serverless-stack/sst/commit/9aa0b7a9f6364a7dfc5f85c713c66687f71110e7) Thanks [@fwang](https://github.com/fwang)! - sst bind: support binding SSR sites

## 2.2.8

### Patch Changes

- [`dd755650f`](https://github.com/serverless-stack/sst/commit/dd755650ff863825af7c241b6516f2c28bda2acd) Thanks [@fwang](https://github.com/fwang)! - sst bootstrap: bootstrap CDK if required

## 2.2.7

### Patch Changes

- [`3977db3f1`](https://github.com/serverless-stack/sst/commit/3977db3f1dd61d71da2fda74edbc25c4ae05d579) Thanks [@fwang](https://github.com/fwang)! - Handle AWS SDK retry failure due to depleted retry tokens

- [`561a1eff3`](https://github.com/serverless-stack/sst/commit/561a1eff35730cb3637448a7a8cfc517c9601c9d) Thanks [@thdxr](https://github.com/thdxr)! - Include stage name in warnings

## 2.2.6

## 2.2.5

### Patch Changes

- [`a6cb8e633`](https://github.com/serverless-stack/sst/commit/a6cb8e633a045aaf723f3ccd64cf348faa2d8bf0) Thanks [@thdxr](https://github.com/thdxr)! - Ignore errors during kysely codegen

## 2.2.4

### Patch Changes

- [`d3b50eed3`](https://github.com/serverless-stack/sst/commit/d3b50eed30790d30c4940f048099b6ae19cf8922) Thanks [@fwang](https://github.com/fwang)! - AppSyncApi: do not bind imported API

- [`c06523416`](https://github.com/serverless-stack/sst/commit/c0652341667959c53eab7f0022a9c6b6501bf791) Thanks [@fwang](https://github.com/fwang)! - NextjsSite: support customizing defaultBehavior

## 2.2.3

### Patch Changes

- [`e836f2d41`](https://github.com/serverless-stack/sst/commit/e836f2d41f97a1ad5f88da7907dff658e72645c4) Thanks [@thdxr](https://github.com/thdxr)! - Allow spaces in folder names go runtime

- [`263c1eff3`](https://github.com/serverless-stack/sst/commit/263c1eff39d19130c56061298387ba4b76c4b81d) Thanks [@thdxr](https://github.com/thdxr)! - Update to ink4 and React 18

- [`6eb618478`](https://github.com/serverless-stack/sst/commit/6eb618478c759305d908ce6213123c505bc2eb0b) Thanks [@thdxr](https://github.com/thdxr)! - Make sure update command exits

## 2.2.2

### Patch Changes

- [`e7107261c`](https://github.com/serverless-stack/sst/commit/e7107261c1110423e27bae0d494fd36942d9d9a2) Thanks [@thdxr](https://github.com/thdxr)! - Support calling useSession in auth function itself

## 2.2.1

### Patch Changes

- [#2604](https://github.com/serverless-stack/sst/pull/2604) [`72cfe68d3`](https://github.com/serverless-stack/sst/commit/72cfe68d3f4eba13edb01ceec3b3418c58f01bda) Thanks [@DCzajkowski](https://github.com/DCzajkowski)! - Fix `sst dev` Node runtime not having all lambda `context` values

- [#2646](https://github.com/serverless-stack/sst/pull/2646) [`4062b3769`](https://github.com/serverless-stack/sst/commit/4062b3769edda28bf94ab5d65f0fb56153c89cbd) Thanks [@DCzajkowski](https://github.com/DCzajkowski)! - Fixed local lambda runtime having access to local env variables

- [`19137504e`](https://github.com/serverless-stack/sst/commit/19137504eec4ae361359fd05eaf19679028ca522) Thanks [@thdxr](https://github.com/thdxr)! - Fixed missing archiver dependency

- [#2677](https://github.com/serverless-stack/sst/pull/2677) [`16a936e38`](https://github.com/serverless-stack/sst/commit/16a936e38e56f5f88c5de7a9c07527949d36f7be) Thanks [@justindra](https://github.com/justindra)! - Exported the Adapter type for future auth, so others can create their own custom adapters

## 2.2.0

### Minor Changes

- [`6e256f344`](https://github.com/serverless-stack/sst/commit/6e256f34402cbd3ef9f64afda036cdb2a64d03d1) Thanks [@thdxr](https://github.com/thdxr)! - Switch to using sst-aws-cdk to patch aws-cdk specifying dependencies incorrectly in their package.json

### Patch Changes

- [`f994e0576`](https://github.com/serverless-stack/sst/commit/f994e057619e51a3b460a6c42abfc8328d9d350d) Thanks [@fwang](https://github.com/fwang)! - sst deploy: skip building Functions and Sites in non-matched stacks

- [`484daf51c`](https://github.com/serverless-stack/sst/commit/484daf51c592a6a7bb46120ef0d0a2cfb3afe7ad) Thanks [@fwang](https://github.com/fwang)! - Function: update runtime property after deferred task

- [#2673](https://github.com/serverless-stack/sst/pull/2673) [`a32692ae3`](https://github.com/serverless-stack/sst/commit/a32692ae352fdc8d23bb013fd17d215413e73464) Thanks [@elonniu](https://github.com/elonniu)! - Bootstrap: use Nodejs16.x runtime in China regions

- [`1ba0f4716`](https://github.com/serverless-stack/sst/commit/1ba0f471682196d53ca86aaf6140dca62da7d6ad) Thanks [@fwang](https://github.com/fwang)! - EventBus: support LogGroup targets

- [`88c7c2e81`](https://github.com/serverless-stack/sst/commit/88c7c2e81376830d61f43fadcd4b800955760e86) Thanks [@fwang](https://github.com/fwang)! - sst remove: update removing loading sign copy

## 2.1.35

### Patch Changes

- [`fd30b0341`](https://github.com/serverless-stack/sst/commit/fd30b034121fd0708d2a96d16aab6242ccd798c0) Thanks [@fwang](https://github.com/fwang)! - CLI: handle AWS SDK throttled requests

## 2.1.34

### Patch Changes

- [`2f8879950`](https://github.com/serverless-stack/sst/commit/2f8879950d9c8652b7d7d80c9f85ab96c68d3b63) Thanks [@fwang](https://github.com/fwang)! - Job: support logRetention setting

## 2.1.33

### Patch Changes

- [`0d2c33ec5`](https://github.com/serverless-stack/sst/commit/0d2c33ec50b1e695f1fc8e22929b4930f6d31cbf) Thanks [@thdxr](https://github.com/thdxr)! - Route live dev payloads over 3mb through S3

## 2.1.32

### Patch Changes

- [#2661](https://github.com/serverless-stack/sst/pull/2661) [`f51d90684`](https://github.com/serverless-stack/sst/commit/f51d90684827da353048bb48c19f331c8b5253fb) Thanks [@justindra](https://github.com/justindra)! - Updated the return page to have a table with all of the clients and input providers

- [#2661](https://github.com/serverless-stack/sst/pull/2661) [`f51d90684`](https://github.com/serverless-stack/sst/commit/f51d90684827da353048bb48c19f331c8b5253fb) Thanks [@justindra](https://github.com/justindra)! - Fixed future Auth redirection to go to port 3000 instead of 300

- [`0fee5241b`](https://github.com/serverless-stack/sst/commit/0fee5241b87441e558c68f5c9ec1a4928a0e11f5) Thanks [@fwang](https://github.com/fwang)! - CLI: retry on throttling errors

## 2.1.31

### Patch Changes

- [`77b09c3d9`](https://github.com/serverless-stack/sst/commit/77b09c3d9429f87db38d2e7b6f9f8b446d010cf2) Thanks [@thdxr](https://github.com/thdxr)! - Support dynamic bootstrap stack name in console

## 2.1.30

### Patch Changes

- [`02c3e454c`](https://github.com/serverless-stack/sst/commit/02c3e454cbadb0e5fa35164c77206b4042ec8108) Thanks [@fwang](https://github.com/fwang)! - Support customizing SST and CDK bootstrap stack

## 2.1.29

## 2.1.28

### Patch Changes

- [#2656](https://github.com/serverless-stack/sst/pull/2656) [`7d8c6e149`](https://github.com/serverless-stack/sst/commit/7d8c6e149de29bcc071975a255944a338ac94062) Thanks [@fwang](https://github.com/fwang)! - Api: support AWS proxy route type

## 2.1.27

### Patch Changes

- [`fd1deffec`](https://github.com/serverless-stack/sst/commit/fd1deffecced1a84c4c7d088bbcc597ec55d1af8) Thanks [@thdxr](https://github.com/thdxr)! - Fixed issue with trying to codegen before RDS is fully up

## 2.1.26

### Patch Changes

- [`164ec076f`](https://github.com/serverless-stack/sst/commit/164ec076febaf7a51e8272c598e83f083a36daf5) Thanks [@thdxr](https://github.com/thdxr)! - Prevent app.finish from being called multiple times

- [`31f7d6cd7`](https://github.com/serverless-stack/sst/commit/31f7d6cd757285799c4825049328198f3548c0e7) Thanks [@thdxr](https://github.com/thdxr)! - Better message when iot errors happen

## 2.1.25

### Patch Changes

- [`1500d4311`](https://github.com/serverless-stack/sst/commit/1500d4311317bad611e2d922bd4d13fe5e6151e2) Thanks [@fwang](https://github.com/fwang)! - Bootstrap: support --qualifier

## 2.1.24

### Patch Changes

- [`b0baaf0ee`](https://github.com/serverless-stack/sst/commit/b0baaf0eefd071190c73fbed3ea3fa724e80575d) Thanks [@thdxr](https://github.com/thdxr)! - IoT usage optimization by narrowing subscriptions

## 2.1.23

### Patch Changes

- [`1dcf6402b`](https://github.com/serverless-stack/sst/commit/1dcf6402bd7cddc87b9c4e592a1116482f6acc98) Thanks [@fwang](https://github.com/fwang)! - sst deploy/dev: retry on CDK DescribeStacks rate exceeded error

## 2.1.22

### Patch Changes

- [`ffbd20ca9`](https://github.com/serverless-stack/sst/commit/ffbd20ca91891075f9add628bff4bf51d0a51d59) Thanks [@thdxr](https://github.com/thdxr)! - Disconnect when multiple sst dev sessions are started for the same stage

- [`36c688ad7`](https://github.com/serverless-stack/sst/commit/36c688ad7ab35e945eefa1b3f437438ed35aea5c) Thanks [@fwang](https://github.com/fwang)! - WebSocketApi: fix API Gateway CloudWatch role permissions issue

## 2.1.21

### Patch Changes

- [`3ef9c7a18`](https://github.com/serverless-stack/sst/commit/3ef9c7a189f21afc93f04fc947c658f55111b3a8) Thanks [@fwang](https://github.com/fwang)! - Nodejs: auto detect and install sharp and pg-native as external

- [`761b6dfc7`](https://github.com/serverless-stack/sst/commit/761b6dfc70f30791f699b69badd1e00aaa9a92c0) Thanks [@fwang](https://github.com/fwang)! - SsrSite: support overriding esbuild config for SSR function

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
