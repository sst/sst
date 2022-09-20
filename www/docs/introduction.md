---
title: Introduction
hide_table_of_contents: true
description: SST Docs
slug: /
---

import config from "../config";
import styles from "./about.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

SST makes it easy to build full-stack serverless applications. You can create APIs, databases, frontends; connect them all together, and deploy them to AWS.
Here's how SST helps:

<!-- - Define infrastructure, simpler than AWS-->

- [High-level components](what-is-sst.md#infrastructure) that simplify building APIs, databases, frontends on AWS. For example, create an API in a few lines.

  <!-- prettier-ignore -->
  ```ts
  new Api(this, "API", {
    routes: {
      "POST /notes": "functions/create.main"
    }
  })
  ```

<!-- - Local development environment, set breakpoints in Lambda functions-->

- [Debug Lambda functions](what-is-sst.md#local-dev) locally with breakpoints and live reload
  <!--
      - Live reload and be able to set breakpoints to test Lambda functions locally.
      - Live reload Lambda functions and set breakpoints to test locally.
      - [Set breakpoints](what-is-sst.md#local-dev) and live reload Lambda functions.
      - [Set breakpoints in Lambda functions](what-is-sst.md#local-dev) without mocking or waiting to redeploy.
      -->
  <!--
      - Connect backend to frontend, no hard coding config
      - [Connect to your frontend](what-is-sst.md#connect-to-the-api) so you don't have to hardcode API endpoints.
      -->
- [Admin dashboard](what-is-sst.md#local-dev) to manage your apps without using the AWS console
  <!--
  - [Web based admin dashboard](what-is-sst.md#local-dev) to invoke functions, query databases, run migrations, without using the AWS Console.
  -->
  <!-- - Supports all AWS services, no lock in -->
- [Full-stack monorepo starters](what-is-sst.md#starters) designed to manage growing serverless projects
  <!--
  - [Full-stack monorepo starters](what-is-sst.md#starters) designed for growing teams and projects
  - Full-stack monorepo starters that help projects as they grow
  - Full-stack monorepo starters designed for growing projects
  - Full-stack monorepo starters designed to manage projects as they grow
  - Full-stack apps in a monorepo structure to manage the complexity
  - Full-stack apps with a monorepo structure to keep things organized
  -->
  <!--
  - [Easily extend SST](what-is-sst.md#all-aws-services) to fit your use case by deploying any AWS service
  - [Easily extend SST](what-is-sst.md#all-aws-services) by deploying any AWS service to fit your use case
  - [Deploy any AWS service](what-is-sst.md#all-aws-services) and extend SST to fit your use case.
  -->

<!--
- A [Live Lambda Development](live-lambda-development.md) environment
- A [web based dashboard](console.md) to manage your apps
- Support for [setting breakpoints and debugging in VS Code](live-lambda-development.md#debugging-with-visual-studio-code)
- Higher-level constructs designed specifically for serverless apps
- Zero-config support for JS and TS (using [esbuild](https://esbuild.github.io)), Go, Python, C#, and F#
-->

[**Learn more about SST**](what-is-sst.md).

```bash
# Create a new SST app
npx create-sst@latest my-sst-app
cd my-sst-app
npm i

# Start Live Lambda Dev
npx sst start

# Open the SST Console
open console.serverless-stack.com

# Deploy to prod
npx sst deploy --stage prod
```

<div className={styles.startPanels}>
  <a className={styles.startPanelDocs} href={useBaseUrl("/learn/")}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-book-open"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>Follow the tutorial</h4>
      <p>Follow our simple tutorial and learn about how SST works.</p>
    </div>
  </a>
  <a className={styles.startPanelExamples} href={config.examples}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-clipboard-list"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>View the examples</h4>
      <p>Check out a list of example serverless apps built with SST.</p>
    </div>
  </a>
  <a className={styles.startPanelGuide} href={config.guide}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-certificate"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>Read the guide</h4>
      <p>Learn how to build a full-stack serverless app with SST.</p>
    </div>
  </a>
</div>

## Join our community

<div className={styles.communityPanels}>
  <a className={styles.communityPanel} href={ config.discord }>
    <div className={styles.communityPanelIconDiscord}>
      <i className="fab fa-discord"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>Discord</h4>
      <p>Join us on Discord and chat with other folks in the community.</p>
    </div>
  </a>
  <a className={styles.communityPanel} href={ config.youtube }>
    <div className={styles.communityPanelIconYouTube}>
      <i className="fab fa-youtube"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>YouTube</h4>
      <p>Subscribe to our channel and watch tutorials, screencasts, and livestreams.</p>
    </div>
  </a>
  <a className={styles.communityPanel} href={ config.twitter }>
    <div className={styles.communityPanelIconTwitter}>
      <i className="fab fa-twitter"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>Twitter</h4>
      <p>Follow us on Twitter and stay up to date on the latest news and announcements.</p>
    </div>
  </a>
  <a className={styles.communityPanel} href={ config.github }>
    <div className={styles.communityPanelIconGitHub}>
      <i className="fab fa-github"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>GitHub</h4>
      <p>Star and watch our repo to be notified on releases and roadmap updates.</p>
    </div>
  </a>
</div>
