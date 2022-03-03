---
id: about
title: Get Started With SST
sidebar_label: Get Started
hide_title: true
hide_table_of_contents: true
description: Serverless Stack (SST) Docs
slug: /
---

import config from "../config";
import styles from "./about.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

<h1 className={styles.title}>Get Started With SST</h1>

<div className={styles.desc}>
Serverless Stack (SST) is a framework that makes it easy to build serverless apps. It features:

- A [Live Lambda Development](live-lambda-development.md) environment
- A [web based dashboard](console.md) to manage your apps
- Support for [setting breakpoints and debugging in VS Code](live-lambda-development.md#debugging-with-visual-studio-code)
- Higher-level constructs designed specifically for serverless apps
- Zero-config support for JS and TS (using [esbuild](https://esbuild.github.io)), Go, Python, C#, and F#

</div>

<div className={styles.startPanels}>
  <a className={styles.startPanelDocs} href={useBaseUrl("/installation")}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-book-open"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>Read the docs</h4>
      <p>Read our friendly docs and learn more about how SST works.</p>
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
      <h4>Follow the guide</h4>
      <p>Follow along step-by-step with our Serverless Stack guide.</p>
    </div>
  </a>
</div>

## Quick start

```bash
# Create a new SST app
npx create-serverless-stack@latest my-sst-app
cd my-sst-app

# Start Live Lambda Dev
npx sst start

# Load the SST Console
> console.serverless-stack.com/acme/local

# Deploy to prod
npx sst deploy --stage prod
```

## Join our community

<div className={styles.communityPanels}>
  <a className={styles.communityPanel} href={ config.slack_invite }>
    <div className={styles.communityPanelIconSlack}>
      <i className="fab fa-slack"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>Slack</h4>
      <p>Join us on Slack and chat with other folks in the community.</p>
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
  <a className={styles.communityPanel} href={ config.twitter }>
    <div className={styles.communityPanelIconTwitter}>
      <i className="fab fa-twitter"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>Twitter</h4>
      <p>Follow us on Twitter and stay up to date on the latest news and announcements.</p>
    </div>
  </a>
  <a className={styles.communityPanel} href={ config.forum }>
    <div className={styles.communityPanelIconDiscourse}>
      <i className="fab fa-discourse"></i>
    </div>
    <div className={styles.communityPanelContent}>
      <h4>Discourse</h4>
      <p>Take part in the discussions and conversation in our Discourse forums.</p>
    </div>
  </a>
</div>
