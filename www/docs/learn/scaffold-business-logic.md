---
title: Scaffold Business Logic
---

import ChangeText from "@site/src/components/ChangeText";

We are ready to add our new comments feature. We'll start by adding the business logic for it. As we mentioned in the last chapter on [Domain Driven Design](domain-driven-design.md), we'll add this to a `core` package. That we'll then use in other parts of our app.

<ChangeText>

Open up `services/core/article.ts` and add the following two functions to the bottom of the file.

</ChangeText>

```js
export async function addComment(articleID: string, text: string) {
  // code for adding a comment to an article
}

export async function comments(articleID: string) {
  // code for getting a list of comments of an article
}
```

These functions will be storing a comment to the database and fetching the comments for an article. Before we interact with our database, let's quickly look at the two database options in our setup.
