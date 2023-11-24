---
"sst": patch
---

Remove unused import of `context/context.ts`
Replace export of `context.ts` by `context2.ts` in sst/src/context
Remove unused file `context/context.ts`
This will fix caching issue encountered by anyone using / building custom hooks
