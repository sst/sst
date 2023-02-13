import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTypedQuery } from "@graphql-dynamo/graphql/urql";
import Empty from "../components/Empty";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import * as styles from "./Home.css";

export default function Home() {
  // Handle empty document cache
  // https://formidable.com/open-source/urql/docs/basics/document-caching/#adding-typenames
  const context = useMemo(() => ({ additionalTypenames: ["Article"] }), []);
  const [articles] = useTypedQuery({
    query: {
      articles: {
        id: true,
        url: true,
        title: true,
      },
    },
    context,
  });

  return (
    <div>
      <Navbar />
      {articles.fetching ? (
        <Loading />
      ) : articles.data?.articles && articles.data?.articles.length > 0 ? (
        <ol className={styles.list}>
          {articles.data?.articles.map((article) => (
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
            </li>
          ))}
        </ol>
      ) : (
        <Empty>&#10024; Post the first link &#10024;</Empty>
      )}
    </div>
  );
}
