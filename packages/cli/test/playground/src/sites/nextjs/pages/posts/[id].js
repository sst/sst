import Head from "next/head";
import Layout from "../../components/layout";
import DateC from "../../components/date";
import utilStyles from "../../styles/utils.module.css";

import { getAllPostIds, getPostData } from "../../lib/posts";

export async function getStaticProps({ params }) {
  const postData = await getPostData(params.id);
  return {
    props: {
      postData,
      time: Date.now(),
      envUrlPublic: process.env.NEXT_PUBLIC_API_URL,
      envUrlPrivate: process.env.API_URL,
    },
  };
}

export async function getStaticPaths() {
  const paths = getAllPostIds();
  return {
    paths,
    fallback: false,
  };
}

export default function Post({ postData, time, envUrlPublic, envUrlPrivate }) {
  return (
    <Layout>
      <Head>
        <title>{postData.title}</title>
      </Head>
      <article>
        <h1 className={utilStyles.headingXl}>{postData.title}</h1>
        <h1 className={utilStyles.headingXl}>Current time: {time}</h1>

        <h1 className={utilStyles.headingXl}>getStaticProps</h1>
        <p>NEXT_PUBLIC_API_URL: {envUrlPublic}</p>
        <p>API_URL: {envUrlPrivate}</p>

        <h1 className={utilStyles.headingXl}>JSX</h1>
        <p>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL}</p>
        <p>API_URL: {process.env.API_URL}</p>

        <div className={utilStyles.lightText}>
          <DateC dateString={postData.date} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
    </Layout>
  );
}
