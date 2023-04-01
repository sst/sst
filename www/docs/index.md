---
title: SST Docs
sidebar_label: Home
hide_table_of_contents: true
description: "SST makes it easy to build modern full-stack applications on AWS."
pagination_prev: null
pagination_next: null
---

import config from "../config";
import styles from "./about.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

---

<div className={styles.heading}>
  <h3>Get Started</h3>
  <p>Start with a standalone SST project. And add any frontend you like.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/start/standalone")}>
      <h3>Standalone</h3>
      <p>Create and deploy a standalone SST app to AWS.</p>
    </a>
  </li>
</ul>

<div className={styles.heading}>
  <h3>Start With Your Frontend</h3>
  <p>Add SST to Next.js, Remix, Astro, Solid, or static site and deploy it to AWS.</p>
</div>

<ul className={styles.features}>
  <li>
    <a href={useBaseUrl("/start/nextjs")}>
      <h3><img src="/img/logos/nextjs.svg" />Next.js</h3>
      <p>Create and deploy a serverless Next.js app to AWS with SST.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/RemixSite")}>
      <h3><img src="/img/logos/remix.svg" />Remix</h3>
      <p>Create and deploy a serverless Remix app to AWS with SST.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/start/astro")}>
      <h3><img src="/img/logos/astro.svg" />Astro</h3>
      <p>Create and deploy an serverless Astro site to AWS with SST.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/SolidStartSite")}>
      <h3><img src="/img/logos/solid.svg" />Solid</h3>
      <p>Create and deploy a serverless SolidStart app to AWS with SST.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/StaticSite")}>
      <h3><img src="/img/logos/html.svg" />Static sites</h3>
      <p>Create and deploy a serverless static site to AWS with SST.</p>
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
    <a href={useBaseUrl("/constructs/RDS")}>
      <h3>Databases</h3>
      <p>Use a serverless SQL or NoSQL database to power your app.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/Api")}>
      <h3>APIs</h3>
      <p>Add a GraphQL or a simple REST API to your app.</p>
    </a>
  </li>
  <li>
    <a href={useBaseUrl("/constructs/Auth")}>
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
      <h3>Jobs</h3>
      <p>Run cron jobs or long running jobs powered by serverless functions.</p>
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
    <a className={styles.startCta} href={useBaseUrl("/start/standalone")}>
      Get Started
      <i class="fas fa-arrow-right"></i>
    </a>
  </div>

</div>

---

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
