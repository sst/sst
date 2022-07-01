---
title: Render Results
---

Let's render our new comments feature.

Add the following below each article in `web/src/pages/Article.tsx`.

```ts {5-12,14-27} title="web/src/pages/Article.tsx"
<div>
  {article.title} - <a href={article.url}>{article.url}</a>
</div>

<div>
  <strong>Comments</strong>
  <ol>
    {article.comments.map(comment => (
      <li>{comment.text}</li>
    ))}
  </ol>
</div>

<form
  onSubmit={async e => {
    const fd = new FormData(e.currentTarget);
    addComment({
      text: fd.get("text")!.toString(),
      articleID: article.id
    });
    e.currentTarget.reset();
    e.preventDefault();
  }}
>
  <input name="text" placeholder="Comment" />
  <button type="submit">Submit</button>
</form>
```

This renders the comments and a comment form. The comment form calls `addComment()` when it's submitted.

Next, let's add the `addComment` Mutation above the `createArticle` Mutation.

```ts {1-9} title="web/src/pages/Article.tsx"
const [, addComment] = useTypedMutation((opts: CommentForm) => ({
  addComment: [
    { text: opts.text, articleID: opts.articleID },
    {
      id: true,
      text: true
    }
  ]
}));

const [, createArticle] = useTypedMutation((opts: ArticleForm) => ({
  createArticle: [

//...
```

And finally, let's define the `CommentForm` type above `ArticleForm`.

```ts {1-4} title="web/src/pages/Article.tsx"
interface CommentForm {
  text: string;
  articleID: string;
}

interface ArticleForm {

//...
```

Now if you refresh the app, you should see the comment form on the page.

![Comment form](/img/render-results/comment-form.png)

Enter `This is easy!` as the **Comment**, and press **Submit**. You should see the new comment rendered on the page!

![Add new comment](/img/render-results/add-new-comment.png)

Our app is now ready to be shipped! So let's deploy it next.
