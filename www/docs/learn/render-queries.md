---
title: Render Queries
---

import ChangeText from "@site/src/components/ChangeText";

Let's now add the comments feature to our frontend React app.

---

## Update GraphQL query

We'll start by updating our homepage to show the number of comments in each article. To do this, we need to update the GraphQL query the homepage is making.

<ChangeText>

In `web/src/pages/Home.tsx`, replace the `useTypedQuery` with:

</ChangeText>

```ts {13-15} title="web/src/pages/Home.tsx"
// Handle empty document cache
// https://formidable.com/open-source/urql/docs/basics/document-caching/#adding-typenames
const context = useMemo(
  () => ({ additionalTypenames: ["Article", "Comments"] }),
  []
);
const [articles] = useTypedQuery({
  query: {
    articles: {
      id: true,
      url: true,
      title: true,
      comments: {
        id: true,
      },
    },
  },
  context,
});
```

Here we are adding `comments` to our query. You'll notice we aren't writing a typical GraphQL query. We are writing the query as an object. It's using a typesafe GraphQL client.

We are also making a change to `additionalTypenames`. This is to fix a quirk of Urql's [Document Cache](https://formidable.com/open-source/urql/docs/basics/document-caching/#document-cache-gotchas), we'll look at this in the next chapter.

---

## Typesafe GraphQL client

To make a GraphQL query, we are using a [React Hook](https://reactjs.org/docs/hooks-overview.html) called `useTypedQuery`.

It's making the `articles` query that we looked at in the [last chapter](queries-and-mutations.md). The change here is that we are now requesting the `comments` field as well.

You'll notice that our code editor can autocomplete all the fields in this query and the new `comments` field is automatically available. Our code editor can also point out if we make a mistake in our query!

<details>
<summary>Behind the scenes</summary>

Let's look at how our typesafe frontend GraphQL client works behind the scenes.

SST uses [Urql](https://formidable.com/open-source/urql/), one of the most popular GraphQL clients. The `useTypedQuery` hook wraps around Urql's [`useQuery`](https://formidable.com/open-source/urql/docs/api/urql/) hook while using the types that [Genql](https://genql.vercel.app) generates based on our GraphQL schema.

The types are code-genned automatically. We looked at this process back in the [GraphQL API](graphql-api.md) chapter.

The `useTypedQuery` hook is imported from the `graphql/` directory in our app. This directory is mostly code-genned but is meant to be committed to Git.

```ts
import { useTypedQuery } from "@my-sst-app/graphql/urql";
```

The `useTypedQuery` hook needs an instance of our GraphQL client to make the queries. We define this in `web/src/main.tsx`.

```ts title="web/src/main.tsx"
const urql = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
});
```

Where `VITE_GRAPHQL_URL` is an environment variable that's passed in through our stacks. We looked at this back in the [Project Structure](project-structure.md) chapter.

To ensure that the `useTypedQuery` hook is able to access our Urql client across our app, we wrap it around our app using the [React Context](https://reactjs.org/docs/context.html).

```tsx title="web/src/main.tsx"
<React.StrictMode>
  <UrqlProvider value={urql}>
    <App />
  </UrqlProvider>
</React.StrictMode>
```

</details>

---

## Render comment count

Now we need to render the results. The `Home` component renders each article on the homepage as a `<li>`.

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

Here we are rendering the count of the comments and linking to the article page.

---

## Client-side routing

The article page is available at `/articles/:id`. Since our app is a frontend [SPA](https://en.wikipedia.org/wiki/Single-page_application) (single-page application) we use a client-side router, called [React Router](https://reactrouter.com) to handle these routes.

<details>
<summary>Behind the scenes</summary>

Let's look at how our router is configured.

We currently have two pages in our application:

1. Homepage — `/`
2. Articles page — `/articles/:id`

We also need a route to handle _404_ pages. For now, we'll redirect everything that doesn't match — `*`, to the homepage.

All of this is configured on the app level in `web/src/main.tsx`.

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

In our article page, we can grab the id of the article from the URL. We do this using the [`useParams`](https://v5.reactrouter.com/web/api/Hooks/useparams) React Router hook.

```ts file="web/src/pages/Article.tsx"
import { useParams } from "react-router-dom";

export default function Article() {
  const { id = "" } = useParams();

  // ...
```

</details>

---

## Styling components

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

We are writing our styles in TypeScript as well.

---

## CSS-in-TS

To do this we use [Vanilla Extract](https://vanilla-extract.style). We define the styles for a component in a `.css.ts`. And we import it in our `Home` component.

```ts
import * as styles from "./Home.css";
```

Then apply it to our HTML components as a regular `className`. So for example, the footer HTML looks like:

```tsx {1,3}
<div className={styles.footer}>
  <strong>{article.comments.length}</strong>
  <span className={styles.footerSeparator}>&bull;</span>
  <Link to={`/article/${article.id}`}>View Comments</Link>
</div>
```

Using _CSS-in-TS_ has a couple of advantages:

1. Style definitions are tied to the components. This isolates the styles to the components, making styles easier to maintain.
2. Full typesafety and autocomplete support. This prevents mistakes in the style definitions.
3. Vanilla Extract also generates static CSS at build time. So it performs just like handwritten CSS.

<details>
<summary>Behind the scenes</summary>

Let's look at how our styles are configured behind the scenes.

Our React app is built using [Vite](https://vitejs.dev). Vanilla Extract has a Vite plugin to process our `*.css.ts` styles.

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

Finally, when we add a style using a `className`; Vanilla Extract replaces it with a autogenerated class name. So the following class:

```ts title="web/src/pages/Home.css.ts"
export const footer = style({
  marginTop: "0.8rem",
});
```

Gets transformed into:

```css
.Home__1fe9q1b4 {
  margin-top: 0.8rem;
}
```

And the HTML for the component goes from this:

```tsx
<div className={styles.footer}>...</div>
```

To this:

```html
<div class="Home__1fe9q1b4">...</div>
```

</details>

Now if you refresh the app, you should see the comment count being displayed under each article.

![Comment count for articles in homepage](/img/render-queries/comment-count-for-articles-in-homepage.png)

---

Next, let's allow our users to view the comments and post them!
