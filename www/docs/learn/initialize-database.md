---
id: initialize-database
title: Initialize Database [J]
description: "Initialize database for an SST app"
---

In the final step in the [Create New Project](create-new-project) section we ran `sst start` to start up the local development environment. Once `sst start` is up and running, you should see the following printed out in the terminal.

```bash
  ==========================
  Starting Live Lambda Dev
  ==========================

  SST Console: https://console.serverless-stack.com/my-sst-app/frank/local
  Debug session started. Listening for requests...
```

Open the SST Console link in the browser, and select the `RDS` explorer.

![](/img/initialize-database/console-rds-tab.png)

Select the `Migrations` button on the right, and apply the `first` migration. This will create a table named `article`.

![](/img/initialize-database/console-apply-migration.png)

Now let's verify the table has been created successfully. Enter `SELECT * FROM article` into the query editor, and select `Execute`. You should see `0 rows` being returned.

![](/img/initialize-database/console-query-article.png)