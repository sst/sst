---
title: Introduction
hide_table_of_contents: true
description: "SST makes it easy to build modern full-stack applications on AWS."
pagination_prev: null
pagination_next: null
---

import config from "../config";
import styles from "./about.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST makes it easy to build modern full-stack applications on AWS.

</HeadlineText>

<div className={styles.summary}>

- **Your favourite frontends**

  Deploy Next.js, Remix, Astro, and Solid apps to your AWS account.

- **Truly full-stack**

  Add any backend feature you need — APIs, databases, auth, cron jobs, and more.

- **Designed for your team**

  Create preview environments or feature environments. Or one for everybody on your team.

</div>

:::tip Learn more
Read the [**What is SST**](what-is-sst.md) chapter to learn more about SST.
:::

<div className={styles.heading}>
  <h3>Everything you need</h3>
  <p>SST gives you the full power of AWS. Making it easy to add any feature to your product.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/constructs/Api")}>
      <h3>APIs</h3>
      <p>Add a GraphQL or a simple REST API to your app.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/RDS")}>
      <h3>Databases</h3>
      <p>Use a serverless SQL or NoSQL databases to power your app.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/auth")}>
      <h3>Auth</h3>
      <p>Authenticate your users through any auth provider.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/Bucket")}>
      <h3>File uploads</h3>
      <p>Upload files to S3 and manage them through the SST console.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/Cron")}>
      <h3>Cron jobs</h3>
      <p>Run cron jobs powered by serverless functions.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/Queue")}>
      <h3>Queues</h3>
      <p>Work with serverless queues without any infrastructure.</p>
    </a>
  </li>
</ul>

<div className={styles.start}>

<span><i className="fas fa-stream"></i></span>

  <div className={styles.startContent}>
    <h4>Quick start</h4>
    <p>Take a quick 10 minute tour of SST to get started.</p>
  </div>
  <div>
    <div className={styles.startCode}>
      <code>> npm create sst@latest</code>
    </div>
    <a className={styles.startCta} href={useBaseUrl("/quick-start")}>
      Get started
      <i class="fas fa-arrow-right"></i>
    </a>
  </div>

</div>
