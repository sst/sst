import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'

export async function getStaticProps() {
  return {
    props: {
      time: Date.now(),
      envUrl: process.env.NEXT_PUBLIC_API_URL,
    },
    revalidate: 10,
  }
}

export default function Page({ time, envUrl }) {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>Current time: {time}</h1>
        <h1 className={utilStyles.headingXl}>Env in jsx: {process.env.NEXT_PUBLIC_API_URL}</h1>
        <h1 className={utilStyles.headingXl}>Env in getServerSideProps: {envUrl}</h1>
      </article>
    </Layout>
  )
}
