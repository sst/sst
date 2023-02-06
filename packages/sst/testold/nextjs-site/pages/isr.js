import Layout from "../components/layout";
import utilStyles from "../styles/utils.module.css";

export async function getStaticProps() {
  return {
    props: {
      time: Date.now(),
    },
    revalidate: 10,
  };
}

export default function Page({ time }) {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>Current time: {time}</h1>
      </article>
    </Layout>
  );
}
