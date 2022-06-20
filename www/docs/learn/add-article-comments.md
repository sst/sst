---
title: Adding Comments to Article
description: "Add Comments to Article"
---

We are going to add comments to articles.

Open up `api/core/article.ts` and add the following two functions to the bottom of the file.

```js
export async function addComment(articleID: string, text: string) {
  // code for adding a comment to an article
}

export async function comments(articleID: string) {
  // code for getting a list of comments of an article
}
```

We are leaving the functions empty on purpose. Next, we will pick a database to use and implement the two functions.