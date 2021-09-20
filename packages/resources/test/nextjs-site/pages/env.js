import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'

export default function Page() {
  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>Client Side Environment Variable</h1>
        <h1 className={utilStyles.headingXl}>Env: {process.env.API_URL}</h1>
      </article>
    </Layout>
  )
}
