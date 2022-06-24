---
title: Initialize the Database
---

Now let's check back in on the `sst start` command that we ran back in the [Create a New Project](create-a-new-project.md) chapter.

Once your local development environment is up and running, you should see the following printed out in the terminal.

```bash
==========================
Starting Live Lambda Dev
==========================

SST Console: https://console.serverless-stack.com/my-sst-app/frank/local
Debug session started. Listening for requests...
```

Open the [SST Console](../console.md) link in the browser, and select the **RDS** explorer.

![Console RDS tab](/img/initialize-database/console-rds-tab.png)

Hit the **Migrations** button on the right, and apply the **article** migration. This will create a table named **article**. It'll be storing all the links that've been submitted to our app.

![Console apply migration](/img/initialize-database/console-apply-migration.png)

Now let's verify that the table has been created successfully.

Enter `SELECT * FROM article` into the query editor, and click **Execute**. You should see **0 rows** being returned.

![Console query article](/img/initialize-database/console-query-article.png)

We are now ready to start up our frontend locally.
