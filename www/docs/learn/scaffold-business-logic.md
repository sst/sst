---
title: Scaffold Business Logic
---

We are ready to add our new comments feature. To do so, we'll first add the business logic for it to our `core` package.

Open up `services/core/article.ts` and add the following two functions to the bottom of the file.

```js
export async function addComment(articleID: string, text: string) {
  // code for adding a comment to an article
}

export async function comments(articleID: string) {
  // code for getting a list of comments of an article
}
```

We are leaving the functions empty on purpose. We'll first pick a database to use and implement the two functions.
