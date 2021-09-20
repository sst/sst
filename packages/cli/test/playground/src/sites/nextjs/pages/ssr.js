import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'

export async function getServerSideProps() {
  return {
    props: {
      time: Date.now(),
      envUrl: process.env.NEXT_PUBLIC_API_URL,
    },
  }
}

export default function Page({ time, envUrl }) {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>SSR - Server Side Rendering</h1>
        <h1 className={utilStyles.headingXl}>Current time: {time}</h1>
        <h1 className={utilStyles.headingXl}>Env in jsx: {process.env.NEXT_PUBLIC_API_URL}</h1>
        <h1 className={utilStyles.headingXl}>Env in getServerSideProps: {envUrl}</h1>
      </article>
    </Layout>
  )
}
