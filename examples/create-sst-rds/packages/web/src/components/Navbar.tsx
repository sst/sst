import { CgLink } from "react-icons/cg";
import { Link, useNavigate } from "react-router-dom";
import { useTypedMutation } from "@create-sst-rds/graphql/urql";
import Button from "./Button";
import styles from "./Navbar.module.css";

interface ArticleForm {
  url: string;
  title: string;
}

export default function Navbar() {
  const navigate = useNavigate();
  const [result, createArticle] = useTypedMutation((opts: ArticleForm) => ({
    createArticle: [
      opts,
      {
        id: true,
      },
    ],
  }));

  return (
    <div className={styles.navbar}>
      <Link to="/" className={styles.title}>
        <span className={styles.logo}>
          <CgLink className={styles.logoIcon} />
        </span>
        <span className={styles.titleCopy}>Links</span>
      </Link>
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();

          const fd = new FormData(e.currentTarget);
          const url = fd.get("url")!.toString();
          const title = fd.get("title")!.toString();

          if (url.length > 0 && title.length > 0) {
            e.currentTarget.reset();
            const result = await createArticle({
              url,
              title,
            });
            navigate(`/article/${result.data?.createArticle.id}`);
          }
        }}
      >
        <input
          type="text"
          name="title"
          placeholder="Title"
          className={styles.field}
        />
        <input
          name="url"
          type="text"
          placeholder="URL"
          className={styles.field}
        />
        <Button
          type="submit"
          loading={result.fetching}
          className={styles.button}
        >
          Submit
        </Button>
      </form>
    </div>
  );
}
