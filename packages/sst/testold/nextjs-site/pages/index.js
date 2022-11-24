import Head from "next/head";
import Link from "next/link";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";

import { getSortedPostsData } from "../lib/posts";

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
}

export default function Home({ allPostsData }) {
  return (
    <Layout home>
      <Head>
        <title>{siteTitle}</title>
      </Head>

      <section className={utilStyles.headingMd}>
        <p>My name is Frank.</p>
        <p>
          (This is a sample website - you’ll be building a site like this on{" "}
          <a href="https://nextjs.org/learn">our Next.js tutorial</a>.)
        </p>
      </section>

      <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
        <h2 className={utilStyles.headingLg}>Blog</h2>
        <ul className={utilStyles.list}>
          <li className={utilStyles.listItem}>
            Static Site Generation
            {allPostsData.map(({ id, title }) => (
              <small className={utilStyles.lightText} key={id}>
                <br />
                <Link href={`/posts/${id}`}>
                  <a>{title}</a>
                </Link>
              </small>
            ))}
          </li>

          <li className={utilStyles.listItem}>
            Static Site Generation (Fallback true)
            {allPostsData.map(({ id, title }) => (
              <small className={utilStyles.lightText} key={id}>
                <br />
                <Link href={`/ssg-fallback-true/${id}`}>
                  <a>{title}</a>
                </Link>
              </small>
            ))}
          </li>

          <li className={utilStyles.listItem}>
            <Link href={`/isr`}>
              <a>Incremental Static Regeneration</a>
            </Link>
          </li>

          <li className={utilStyles.listItem}>
            <Link href={`/ssr`}>
              <a>Server Side Rendering</a>
            </Link>
          </li>

          <li className={utilStyles.listItem}>
            <Link href={`/ssr-not-found`}>
              <a>Server Side Rendering (Not Found)</a>
            </Link>
          </li>

          <li className={utilStyles.listItem}>
            <Link href={`/ssr-redirect`}>
              <a>Server Side Rendering (Redirect to /ssr)</a>
            </Link>
          </li>

          <li className={utilStyles.listItem}>
            <Link href={`/csr`}>
              <a>Client Side Rendering</a>
            </Link>
          </li>

          <li className={utilStyles.listItem}>
            <Link href={`/env`}>
              <a>Client Side Environment Variable</a>
            </Link>
          </li>
        </ul>
      </section>
    </Layout>
  );
}
