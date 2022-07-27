import { useTypedMutation, useTypedQuery } from "../urql";

interface ArticleForm {
  title: string;
  url: string;
}

export function List() {
  const [articles] = useTypedQuery({
    query: {
      articles: {
        id: true,
        title: true,
        url: true
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
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
