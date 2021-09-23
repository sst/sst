import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'

export async function getStaticProps(context) {
  return {
    props: {
      isPreview: context.preview ? "true" : "false",
      envUrl: process.env.NEXT_PUBLIC_API_URL,
    }
  }
}

export default function Post({ isPreview, envUrl }) {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>Is Preview: {isPreview}</h1>
        <h1 className={utilStyles.headingXl}>Env in jsx: {process.env.NEXT_PUBLIC_API_URL}</h1>
        <h1 className={utilStyles.headingXl}>Env in getStaticProps: {envUrl}</h1>
      </article>
    </Layout>
  )
}
