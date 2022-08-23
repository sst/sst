---
title: Render Queries
---

import ChangeText from "@site/src/components/ChangeText";

Now that the comments have been added to our GraphQL API, we are ready to connect it to our React frontend.

Let's start by updating our homepage first to show how many comments each article has. To do this we need to update the query our frontend is making to our GraphQL API.

<ChangeText>

In `web/src/pages/Home.tsx`, add `comments` in the articles query.

</ChangeText>

```ts {7-10} title="web/src/pages/Home.tsx"
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

You'll notice we aren't writing a typical GraphQL query. We are using a typesafe GraphQL client on the frontend. Let's look at what we are doing here.

### Typesafe GraphQL client

We are calling a [React Hook](https://reactjs.org/docs/hooks-overview.html) called `useTypedQuery` that's connected to our backend.

We are using the `articles` query that we looked at back in the [Queries and Mutations](queries-and-mutations.md) chapter. We are now requesting the `comments` field as well.

You'll notice that all the fields in this query autocomplete and the new `comments` field is also automatically available.

:::info Behind the scenes
Let's look at how our typesafe frontend GraphQL client works behind the scenes.

SST uses [urql](https://formidable.com/open-source/urql/) as its GraphQL client and uses the types that [Genql](https://genql.vercel.app) generates to allow us to write typesafe queries.

The `useTypedQuery` hook wraps around urql's `useQuery` hook while using the types that Genql generates based on our GraphQL schema.

The types are code genned automatically. We looked at this process back in the [GraphQL API](graphql-api.md) chapter.

We import `useTypedQuery` from the `graphql/` directory in our app. This directory is mostly code genned but is meant to be commited to Git.

The `useTypedQuery` hook needs an instance of our GraphQL client. We define this in `web/src/main.tsx`.

```ts title="web/src/main.tsx"
const urql = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
});
```

Where `VITE_GRAPHQL_URL` is an environment variable that's passed in through in our stacks. We looked at this back in the [Project Structure](project-structure.md) chapter.

To ensure that the `useTypedQuery` hook is able to access our urql client across our app, we set it using the [React Context](https://reactjs.org/docs/context.html).

```ts title="web/src/main.tsx"
<React.StrictMode>
  <UrqlProvider value={urql}>
    <App />
  </UrqlProvider>
</React.StrictMode>
```

:::

Next let's render the results.

The `Home` component renders each article on the homepage as a `<li>`.

<ChangeText>

Replace the `<li>` tag in the `return` statement of the `Home` component with.

</ChangeText>

```tsx {11-15} title="web/src/pages/Home.tsx"
<li key={article.id} className={styles.article}>
  <div>
    <h2 className={styles.title}>
      <Link to={`/article/${article.id}`}>{article.title}</Link>
    </h2>
    &nbsp;
    <a target="_blank" href={article.url} className={styles.url}>
      ({article.url.replace(/(^\w+:|^)\/\//, "")})
    </a>
  </div>
  <div className={styles.footer}>
    <strong>{article.comments.length}</strong>
    <span className={styles.footerSeparator}>&bull;</span>
    <Link to={`/article/${article.id}`}>View Comments</Link>
  </div>
</li>
```

Here we are rendering the count of the comments and linking to them.

### Client-side routing

The article page is available at `/articles/:id`. Since our app is a frontend [SPA](https://en.wikipedia.org/wiki/Single-page_application) (single-page applicaiton) we use a client-side router, called [React Router](https://reactrouter.com) to handle these routes.

:::info Behind the scenes
Let's look at our router is confirgured.

We currently have two pages in our application:

1. Homepage — `/`
2. Articles page — `/articles/:id`

We also need a route to handle _404_ pages. For now, we'll redirect everything that doesn't match — `*`, to the homepage as well.

All of this is configured on the app level in the `web/src/main.tsx`.

```tsx title="web/src/main.tsx"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="article/:id" element={<Article />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Now when we head over to an article page, we can grab the id of the article from the URL. We do this using the `useParams` hook.

```ts file="web/src/pages/Article.tsx"
import { useParams } from "react-router-dom";

export default function Article() {
  const { id = "" } = useParams();

  // ...
```

:::

We also need to add a couple of styles to render the comments count in our homepage.

<ChangeText>

Add this to the bottom of our stylesheet in `web/src/pages/Home.css.ts`.

</ChangeText>

```ts title="web/src/pages/Home.css.ts"
export const footer = style({
  marginTop: "0.8rem",
});

export const footerSeparator = style({
  margin: "0 0.5rem",
});
```

You'll notice that we are writing our styles in TypeScript as well.

### CSS-in-TS

We are using [Vanilla Extract](https://vanilla-extract.style) for this.

Here we define the styles for a component in a `.css.ts`. For example, the `footer` above.

We then import that in our `Home` component.

```ts
import * as styles from "./Home.css";
```

And apply it to the footer HTML component.

```tsx
<div className={styles.footer}>
  <strong>{article.comments.length}</strong>
  <span className={styles.footerSeparator}>&bull;</span>
  <Link to={`/article/${article.id}`}>View Comments</Link>
</div>
```

Using _CSS-in-TS_ using Vanilla Extract has a couple of advantages:

1. Style definitions that are tied to the components. This isolates the styles to the components, making styles easier to maitain.
2. Full typesafety and autocomplete support, preventing mistakes the style definitions.
3. Vanilla Extract also generates static CSS at build time. So it performs just like handwritten CSS.

:::info Behind the scenes
Let's look at how our Vanilla Extract styles are confgiured behind the scenes.

Our React app is built using [Vite](https://vitejs.dev). So we first use a Vite plugin to process our Vanilla Extract `*.css.ts` styles.

```ts title="web/vite.config.ts"
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
```

We then declare a set of CSS variables as our theme in `web/src/vars.css.ts`.

```ts title="web/src/vars.css.ts"
const root = createGlobalTheme(":root", {
  fonts: {
    body: '"Source Sans Pro", sans-serif',
    code: '"Source Code Pro", monospace',
    heading: '"Roboto Slab", serif',
  },
  buttons: {
    // ...
  },
  colors: {
    // ...
  },
});
```

These get transformed at runtime into something like this:

```css
:root {
  --fonts-body__1m2xgwb8: "Source Sans Pro", sans-serif;
  --fonts-code__1m2xgwb9: "Source Code Pro", monospace;
  --fonts-heading__1m2xgwba: "Roboto Slab", serif;
}
```

Once declared, we can now use these variables in our styles. For example, we define some global styles in `web/src/index.css.ts`.

```ts title="web/src/index.css.ts"
import { vars } from "./vars.css";

globalStyle("body", {
  margin: 0,

  fontFamily: vars.fonts.body,
  color: vars.colors.text.normal,
  background: vars.colors.background,
});
```

Just as before, these get rendered in runtime into regular CSS.

```css
body {
  font-family: var(--fonts-body__1m2xgwb8);
  color: var(--colors-text-normal__1m2xgwb6);
  background: var(--colors-background__1m2xgwb5);
}
```

:::

Now if you refresh the app, you should see the comment count being displayed under each article.

INSERT SCREENSHOT

<!--
![Comment count for articles in homepage](/img/render-queries/comment-count-for-articles-in-homepage.png)
-->

Next, let's allow our users to view and comments to the posted articles.
