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

---

<div className={styles.heading}>
  <h3>Start With Your Frontend</h3>
  <p>Deploy Next.js, Remix, Astro, Solid, or any static site to AWS.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/frontends/nextjs")}>
      <h3>Next.js</h3>
      <p>Deploy a serverless Next.js app to your AWS account.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/frontends/remix")}>
      <h3>Remix</h3>
      <p>Deploy a Remix SSR app to your AWS account.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/frontends/astro")}>
      <h3>Astro</h3>
      <p>Deploy an Astro SSR app to your AWS account.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/frontends/solid")}>
      <h3>Solid</h3>
      <p>Deploy a SolidStart app to your AWS account.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/frontends/static-site")}>
      <h3>Static sites</h3>
      <p>Deploy any static site to your AWS account.</p>
    </a>
  </li>
</ul>

:::tip Learn more
Read the [**What is SST**](what-is-sst.md) chapter to learn more about SST.
:::

<div className={styles.heading}>
  <h3>Add Any Backend Feature</h3>
  <p>SST gives you the full power of AWS. Making it easy to add any feature to your product.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/databases")}>
      <h3>Databases</h3>
      <p>Use a serverless SQL or NoSQL database to power your app.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/apis")}>
      <h3>APIs</h3>
      <p>Add a GraphQL or a simple REST API to your app.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/auth")}>
      <h3>Auth</h3>
      <p>Authenticate your users through any auth provider.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/file-uploads")}>
      <h3>File uploads</h3>
      <p>Upload files to S3 and manage them through the SST console.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/jobs")}>
      <h3>Jobs</h3>
      <p>Run cron jobs or long running jobs powered by serverless functions.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/queues")}>
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
      Get Started
      <i class="fas fa-arrow-right"></i>
    </a>
  </div>

</div>

---

<div className={styles.heading}>
  <h3>Reference</h3>
  <p>Links to reference docs for the various packages in SST.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/packages/sst")}>
      <h3>CLI</h3>
      <p>Use the CLI to build, deploy, and test your SST apps.</p>
    </a>
  </li>
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
  <li>
    <a href={useBaseUrl("/packages/sst-env")}>
      <h3>sst-env</h3>
      <p>A CLI to load the environment variables from your backend.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/packages/create-sst")}>
      <h3>create-sst</h3>
      <p>CLI to create a new SST project from a template or an example.</p>
    </a>
  </li>
</ul>

---
