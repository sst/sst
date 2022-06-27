---
title: Render Results
---

Open up `web/src/pages/Article.tsx`, render comments and a comment form below each article.

```ts {5-12,14-27}
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

This creates a form that will call `addComment()` on submission.

Let's add the `addComment` Mutation above the `createArticle` Mutation.

```ts {1-9}
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
  ...
```

And finally, let's define the `CommentForm` type above `ArticleForm`.

```ts {1-4}
interface CommentForm {
  text: string;
  articleID: string;
}

interface ArticleForm {
...
```

Now if you refresh the page, you should see the comment form on the page.

![](/img/render-comments/comment-form.png)

Enter `This is easy!` for `Comment`, and press `Submit`. You should see the new comment rendered on the page.

![](/img/render-comments/new-comment.png)
