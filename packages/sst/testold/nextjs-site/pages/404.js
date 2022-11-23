import Layout from "../components/layout";
import utilStyles from "../styles/utils.module.css";

export default function Page() {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>404</h1>
      </article>
    </Layout>
  );
}
