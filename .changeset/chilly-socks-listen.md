---
"@serverless-stack/core": patch
"@serverless-stack/resources": patch
---

Add sourcemap property to control sourcemap generation for NodeJS functions. This defaults to `false` when deployed so be sure to set it if you want sourcemap support
