import Layout from "../components/layout";
import utilStyles from "../styles/utils.module.css";

export async function getStaticProps() {
  return {
    props: {
      time: Date.now(),
      envUrlPublic: process.env.NEXT_PUBLIC_API_URL,
      envUrlPrivate: process.env.API_URL,
    },
    revalidate: 10,
  };
}

export default function Page({ time, envUrlPublic, envUrlPrivate }) {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>
          ISR - Incremental Static Rendering
        </h1>
        <h1 className={utilStyles.headingXl}>Current time: {time}</h1>

        <h1 className={utilStyles.headingXl}>getStaticProps</h1>
        <p>NEXT_PUBLIC_API_URL: {envUrlPublic}</p>
        <p>API_URL: {envUrlPrivate}</p>

        <h1 className={utilStyles.headingXl}>JSX</h1>
        <p>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL}</p>
        <p>API_URL: {process.env.API_URL}</p>
      </article>
    </Layout>
  );
}
