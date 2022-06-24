---
title: Linting and Type Checking
description: "Configuring linting and type check in SST (SST)"
---

## During development

For linting and typechecking during development, it is best to rely on your editor to provide this information. Editors can make use of language servers give instant feedback on errors in your code.

## During CI

We provide a `typecheck` script in our starters that you can run to check both your stacks and backend code. This just runs `tsc --noEmit` under the hood.

You should run this as a step before deployment to make sure typechecking errors do not make it to production. 

```bash
# Typecheck stacks code
npm run typecheck

# Typecheck backend
cd backend && npm run typecheck
```
