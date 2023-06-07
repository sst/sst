---
"sst": minor
---

Breaking change in future/auth:

Instead of returning the session directly from `onSuccess` there is now a second paramter passed in called `response`. You can use this to create sessions `return response.session` but can also instead chain other providers or return a normal HTTP response. This comes in handy when creating multi-step auth processes or when connecting external services to an existing account.
