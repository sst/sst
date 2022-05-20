---
"@serverless-stack/cli": minor
"@serverless-stack/console": minor
"@serverless-stack/core": minor
"@serverless-stack/resources": minor
"@serverless-stack/static-site-env": minor
---

Moved codebase to ESM. This should not have any impact on your codebase if you are not using ESM. If you are using ESM and you are using an esbuild plugin, be sure to rename your plugins file to have a .cjs extension
