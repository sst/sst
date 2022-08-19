---
title: Fetch Data
---

import ChangeText from "@site/src/components/ChangeText";

Now that the comments have been added to our GraphQL API, we are ready to connect it to our React frontend.

Let's start by updating our homepage first to show how many comments each article has. First let's update the query our frontend is making to our GraphQL API.

<ChangeText>

In `web/src/pages/Article.tsx`, add `comments` in the articles query.

</ChangeText>

```ts {7-10} title="web/src/pages/Article.tsx"
const [articles] = useTypedQuery({
  query: {
    articles: {
      id: true,
      url: true,
      title: true,
      comments: {
        id: true,
        text: true,
      },
    },
  },
});
```

Next let's render the results. Don't worry we'll look at how all this works in a second.

The `Home` component renders each article on the homepage as a `<li>`.

<ChangeText>

Replace the `<li>` tag in the `return` statement of the `Home` component with.

</ChangeText>

```ts {14-18} title="web/src/pages/Article.tsx"
<li key={article.id} className={styles.article}>
  <div>
    <div>
      <div>
        <h2 className={styles.title}>
          <Link to={`/article/${article.id}`}>{article.title}</Link>
        </h2>
        &nbsp;
        <a target="_blank" href={article.url} className={styles.url}>
          ({article.url.replace(/(^\w+:|^)\/\//, "")})
        </a>
      </div>
    </div>
    <div className={styles.footer}>
      <strong>{article.comments.length}</strong>
      <span className={styles.footerSeparator}>&bull;</span>
      <Link to={`/article/${article.id}`}>View Comments</Link>
    </div>
  </div>
</li>
```

Here we are rendering the count of the comments and linking to them.

We also need to add a couple of styles to render this.

<ChangeText>

Add this to the bottom of our stylesheet in `web/src/pages/Article.css.ts`.

</ChangeText>

```ts title="web/src/pages/Article.css.ts"
export const footer = style({
  marginTop: "0.8rem",
});

export const footerSeparator = style({
  margin: "0 0.5rem",
});
```

Now if you refresh the app, you should see the comment count being displayed under each article.

<!--
![Comment count for articles in homepage](/img/fetch-data/comment-count-for-articles-in-homepage.png)
-->

Next, let's allow our users to be able to post comments.
