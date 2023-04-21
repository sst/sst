import { useParams } from "react-router-dom";
import { useTypedQuery } from "@graphql-dynamo/graphql/urql";
import Empty from "../components/Empty";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import styles from "./Article.module.css";

export default function Article() {
  const { id = "" } = useParams();

  const [article] = useTypedQuery({
    query: {
      article: [
        { articleID: id },
        {
          id: true,
          url: true,
          title: true,
        },
      ],
    },
  });

  return (
    <div>
      <Navbar />
      {article.fetching ? (
        <Loading />
      ) : article.data?.article ? (
        <div className={styles.article}>
          <h1>{article.data.article.title}</h1>
          <p>
            <a target="_blank" href={article.data.article.url}>
              {article.data.article.url}
            </a>
          </p>
        </div>
      ) : (
        <Empty>Not Found</Empty>
      )}
    </div>
  );
}
