---
title: Introduction
hide_table_of_contents: true
description: SST Docs
slug: /
---

import config from "../config";
import styles from "./about.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

<div className={styles.desc}>
SST makes it easy to build full-stack serverless applications on AWS.
</div>

<div className={styles.features}>

- [**High-level components**](what-is-sst.md#infrastructure) to simplify building APIs, databases, and frontends on AWS.
  - Avoid having to configure ten different AWS resources just to create a simple API.
- [**Set breakpoints in VS Code**](what-is-sst.md#local-dev) and debug Lambda functions locally in real-time.
  - You won't need to create mock request objects or deploy every time you make a change.
- [**Admin dashboard**](what-is-sst.md#local-dev) to view logs, run queries, browse uploads, apply migrations, and more.
  - Way better than clicking through a dozen different services in the AWS console.
- [**Full-stack starters**](what-is-sst.md#starters) with all the best practices, designed like monoliths.
  - Don't spend days organizing your functions or getting secrets, testing, etc., to work.

</div>

<div className={styles.learnMore}>

Learn more: [What is SST](what-is-sst.md) | [Live Lambda](live-lambda-development.md) | [SST Console](console.md) | [FAQ](faq.md)

</div>

---

## Try it out

```bash
# Create a new SST app
npx create-sst@latest my-sst-app
cd my-sst-app
npm i

# Start Live Lambda Dev
npx sst start

# Open the SST Console
open console.sst.dev

# Deploy to prod
npx sst deploy --stage prod
```

## Get started

<div className={styles.startPanels}>
  <a className={styles.startPanelDocs} href={useBaseUrl("/quick-start")}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-stream"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>Do the quick start</h4>
      <p>Take a quick tour of SST and deploy your first full-stack app.</p>
    </div>
  </a>
  <a className={styles.startPanelExamples} href={useBaseUrl("/learn/")}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-clipboard-list"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>Follow the tutorial</h4>
      <p>A tutorial on how to add a new feature to your SST app.</p>
    </div>
  </a>
  <a className={styles.startPanelGuide} href={config.guide}>
    <span className={styles.startPanelIcon}>
      <i className="fas fa-book-open"></i>
    </span>
    <div className={styles.startPanelContent}>
      <h4>Read the guide</h4>
      <p>Learn to build a full-stack serverless app from scratch with SST.</p>
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
