import useSWR from "swr";
import Layout from "../components/layout";
import utilStyles from "../styles/utils.module.css";

// eslint-disable-next-line no-undef
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Page() {
  const { data } = useSWR("/api/hello", fetcher);
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>CSR - Client Side Rendering</h1>
        <h1 className={utilStyles.headingXl}>Data: {JSON.stringify(data)}</h1>
      </article>
    </Layout>
  );
}
