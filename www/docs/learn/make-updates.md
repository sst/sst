---
title: Make Updates
---

import ChangeText from "@site/src/components/ChangeText";

We'd like our users to be able to navigate to the article page, view the comments and post them.

---

## Update query

To do that, let's update the query in the article page.

<ChangeText>

In `packages/web/src/pages/Article.tsx`, replace the `useTypedQuery` with:

</ChangeText>

```ts title="packages/web/src/pages/Article.tsx" {1-3,12-15,19}
// Handle empty document cache
// https://formidable.com/open-source/urql/docs/basics/document-caching/#adding-typenames
const context = useMemo(() => ({ additionalTypenames: ["Comment"] }), []);
const [article] = useTypedQuery({
  query: {
    article: {
      __args: {
        articleID: id
      },
      id: true,
      url: true,
      title: true,
      comments: {
        id: true,
        text: true,
      },
    },
  },
  context,
});
```
In this updated version, we have made a couple of notable changes to enhance the functionality of our GraphQL query:

1. **Fetching Comments**: In our previous implementation, we fetched the `id`, `url`, and `title` fields of an article. Now, we've expanded our query to also retrieve the `comments` associated with the article. Each comment is represented by its `id` and `text` fields. This allows us to bring in additional relational data in a single query, effectively reducing the need for additional network requests.

2. **Using `useMemo` Hook**: We've introduced the use of the `useMemo` hook from React to create the `context` object. This hook will ensure that our `context` object is memoized and will only be recalculated if its dependencies change. In this case, we have no dependencies (`[]`), so it will only be calculated once. This is beneficial for performance, especially in larger components or applications.

3. **Adding `additionalTypenames`**: Inside the `context` object, we're specifying `additionalTypenames` with a value of `["Comment"]`. This is a list of GraphQL types that may be affected by our query. Urql's [Document Cache](https://formidable.com/open-source/urql/docs/basics/document-caching/#document-cache-gotchas) uses this information to correctly update the cache after a mutation. The Document Cache identifies entities in the cache by their `__typename` and `id` (or `_id`). When a mutation occurs, it knows that it may have to invalidate or update entities of certain types. By explicitly stating that we expect entities of type `Comment`, we're ensuring that the cache can correctly update if any comments are added, modified, or removed. This helps maintain the consistency and accuracy of our cache.

These changes provide us with a more efficient query and ensure a smoother and more accurate interaction with our cache.

<details>
<summary>Behind the scenes</summary>

As we looked at in the [last chapter](render-queries.md#typesafe-graphql-client), we are using Urql as our GraphQL client. One notable feature of Urql is the way it caches our requests.

It avoids sending the same request to a GraphQL API repeatedly by caching the result of each query. It works like the cache in a browser. So if you go to your app homepage, navigate to an article, and navigate back; the homepage will load instantly. Urql automatically tracks what's been fetched and refetches queries when the data has been mutated.

By default, this is an in-memory cache, but you can configure Urql to store this in the browser's local storage. Urql's powerful caching mechanism is partly why we recommend it in our starter.

Behind the scenes, Urql creates a key for each request that's sent based on a query and its variables. It also requests additional type information from the GraphQL API. This adds an additional `__typename` field to a query's results. This field specifies the type being returned, and Urql keeps track of this.

So when we send a mutation and Urql notices that it has a type that was previously requested in a cached query, it'll invalidate that query's cache automatically!

This works great except for the case where a query returns an empty set of results and there is no `__typename` field. Without this info, Urql wouldn't know that it needs to invalidate the cache.

</details>

Next, we need to add the mutation to post a comment.

---

## Add mutation

<ChangeText>

Add this below the `useTypedQuery`.

</ChangeText>

```ts title="packages/web/src/pages/Article.tsx"
  const [result, addComment] = useTypedMutation((opts: CommentForm) => ({
    addComment: {
      __args: {
        text: opts.text,
        articleID: opts.articleID,
      },
      id: true,
    },
  }));
```

The `useTypedMutation` hook is similar to the `useTypedQuery` hook that we covered in the [last chapter](render-queries.md#typesafe-graphql-client). It allows us to send mutations that are defined using TypeScript. Here we are calling the `addComment` mutation that we added back in the [Queries and Mutations](queries-and-mutations.md#create-a-new-mutation) chapter.

This query takes two arguments; `text` and `articleID`. This will be sent when the user submits the comments form. So let's define a type called `CommentForm` for it.

<ChangeText>

Add this below all of our imports at the top of `packages/web/pages/Article.tsx`.

</ChangeText>

```ts title="packages/web/src/pages/Article.tsx"
interface CommentForm {
  text: string;
  articleID: string;
}
```

Now let's render the comments.

---

## Render comments

<ChangeText>

Add this below the HTML `<p>...</p>` component in the `return` statement.

</ChangeText>

```tsx title="packages/web/src/pages/Article.tsx"
<ol className={styles.comments}>
  {article.data.article.comments?.map((comment) => (
    <li key={comment.id} className={styles.comment}>
      {comment.text}
    </li>
  ))}
</ol>
```

This is grabbing the comments from the query results and rendering each comment.

Next, let's render the comment form.

---

## Add comment form

<ChangeText>

Add this below the `<ol>...</ol>` component that we just added.

</ChangeText>

```tsx title="packages/web/src/pages/Article.tsx"
<form
  className={styles.form}
  onSubmit={async (e) => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const text = fd.get("text")!.toString();

    e.currentTarget.reset();

    text.length > 0 &&
      (await addComment({
        text,
        articleID: id,
      }));
  }}
>
  <textarea name="text" className={styles.field}></textarea>
  <Button
    type="submit"
    variant="secondary"
    className={styles.button}
    loading={result.fetching || article.stale}
  >
    Add Comment
  </Button>
</form>
```

There are a couple of things of note here.

- We are rendering a textarea where the user can type in a comment. When they submit the form, we grab the comment text from the `FormData` and call our mutation hook, `addComment`.
- The button to submit the form is a custom component that comes with this starter, called `Button`. Aside from being styled, it allows us to display a little spinner when the request is being made. We set this using the `loading` prop.

Let's import this `Button` component and a couple of other things.

<ChangeText>

Replace the `useTypedQuery` import in `packages/web/pages/Article.tsx` with this:

</ChangeText>

```ts title="packages/web/src/pages/Article.tsx"
import { useMemo } from "react";
import { useTypedQuery, useTypedMutation } from "@my-sst-app/graphql/urql";
import Button from "../components/Button";
```

Our components also need some styles, let's add that next.

---

## Style comments

<ChangeText>

Add the following at the end of `packages/web/pages/Article.module.css`.

</ChangeText>

```css title="packages/web/src/pages/Article.module.css"
.comments {
  padding: 0;
  margin: 1rem 0 0;
  list-style: none;
}

.comment {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-divider);
}

.form {
  margin-top: 1rem;
}

.field {
  width: 100%;
  display: block;
  max-width: 600px;
}

.button {
  margin-top: 1rem;
}
```

Now if you refresh the app, and head over to an article page, you'll see the comment form.

---

## Test adding comments

Try adding your first comment.

![New comment added in the article page](/img/make-updates/new-comment-added-in-the-articles-page.png)

You'll notice it gets rendered right away. And the button shows a little loading spinner while the request is being made.

---

## Auto refetching queries

If you've been following along closely, you might've noticed something interesting. We aren't doing anything special to render the newly added comment!

The `addComment` mutation returns the type `Comment`. Recall that we told Urql that this `Comment` type has been cached as a part of the `article` query.

```ts
const context = useMemo(() => ({ additionalTypenames: ["Comment"] }), []);
const [article] = useTypedQuery({
  ...
```

So it'll refetch this query in the background and the `useTypedQuery` hook will re-render the component.

Urql also sets the `article.stale` flag to `true` while refetching. We use this flag to display the loading spinner on our button.

```tsx {5}
<Button
  type="submit"
  variant="secondary"
  className={styles.button}
  loading={result.fetching || article.stale}
>
  Add Comment
</Button>
```

This allows us to show the loading spinner while the comment is being posted, and while the comments are refetched.

<details>
<summary>Behind the scenes</summary>

The `addComment` mutation returns an object with `__typename`, `Comment`. If you inspect the network requests, it'll look something like this.

```json
{
  "data": {
    "addComment": {
      "id": "01GB6C5DK6YBDDYE9CSZGF8DN4",
      "__typename": "Comment"
    }
  }
}
```

We als tell Urql that our `article` query contains the type `Comments` by passing in the `additionalTypenames` as a context.

```ts
const context = useMemo(() => ({ additionalTypenames: ["Comment"] }), []);
```

Recall that we need to do this because initially the `article` query might not have any comments. So it won't be able to rely on the `__typename` that's returned.

Now when Urql sees a mutation that affects the `Comment` type, it'll look for all the queries on the page that contain that type and refetch them in the background.

</details>

---

Our app is now ready to be shipped! So let's deploy it to production!
