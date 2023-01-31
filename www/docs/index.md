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

  Create preview environments or feature environments. Or one for everyone on your team.

<div className={styles.heading}>
  <h3>Add Any Backend Feature</h3>
  <p>SST gives you the full power of AWS. Making it easy to add any feature to your product.</p>
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
      <p>Use a serverless SQL or NoSQL database to power your app.</p>
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

<div className={styles.heading}>
  <h3>CLI Docs</h3>
  <p>Links to reference docs for the CLIs used in SST.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/packages/sst")}>
      <h3>sst</h3>
      <p>Use the SST CLI to build, deploy, and test your apps.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/packages/create-sst")}>
      <h3>create-sst</h3>
      <p>CLI to create a new SST project from a template or an example.</p>
    </a>
  </li>
</ul>

<div className={styles.heading}>
  <h3>Reference Docs</h3>
  <p>Links to reference docs for the SST's constructs and clients.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/constructs")}>
      <h3>Constructs</h3>
      <p>Reference docs for all of SST's constructs.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/clients")}>
      <h3>Clients</h3>
      <p>Reference docs for the Node Lambda function clients.</p>
    </a>
  </li>
</ul>

---
