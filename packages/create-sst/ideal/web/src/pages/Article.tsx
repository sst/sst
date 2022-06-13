import { useTypedMutation, useTypedQuery } from "../urql";

interface ArticleForm {
  title: string;
  url: string;
}

interface CommentForm {
  text: string;
  articleID: string;
}

export function List() {
  const [articles] = useTypedQuery({
    query: {
      articles: {
        id: true,
        title: true,
        url: true,
        comments: {
          text: true
        }
      }
    }
  });

  const [, createArticle] = useTypedMutation((opts: ArticleForm) => ({
    createArticle: [
      opts,
      {
        id: true,
        url: true
      }
    ]
  }));

  const [, addComment] = useTypedMutation((opts: CommentForm) => ({
    addComment: [
      { text: opts.text, articleID: opts.articleID },
      {
        id: true,
        text: true
      }
    ]
  }));

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Articles</h2>
      <h3>Submit</h3>
      <form
        onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createArticle({
            url: fd.get("url")!.toString(),
            title: fd.get("title")!.toString()
          });
          e.currentTarget.reset();
        }}
      >
        <input name="title" placeholder="title" />
        <input name="url" placeholder="url" />
        <button type="submit">Submit</button>
      </form>
      <h3>Latest</h3>
      <ol>
        {articles.data?.articles.map(article => (
          <li>
            <div>
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
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
