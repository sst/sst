---
"@serverless-stack/node": minor
---

SST Auth is available! Checkout docs here: https://sst.dev/auth

Breaking Changes:
- The old sst.Auth construct has been renamed to sst.Cognito. If you are using it be sure to update all references to sst.Cognito - no other changes should be needed.
- The import for `createGQLHandler` has changed to `GraphQLHandler` to match `AuthHandler` and other handlers we will be shipping soon.
