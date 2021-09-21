import Layout from "../components/layout";
import utilStyles from "../styles/utils.module.css";

export async function getServerSideProps() {
  return {
    props: {
      time: Date.now(),
    },
  };
}

export default function Page({ time }) {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>SSR - Server Side Rendering</h1>
        <h1 className={utilStyles.headingXl}>Current time: {time}</h1>
      </article>
    </Layout>
  );
}
