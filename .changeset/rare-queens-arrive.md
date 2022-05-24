---
"@serverless-stack/core": patch
"@serverless-stack/resources": patch
---

Move graphql to peer dependencies by implementing weakImport. If you are using the AppSyncApi construct be sure to add `graphql` and `@graphql-tools/merge` to your dependencies.
