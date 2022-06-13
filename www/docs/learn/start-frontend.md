---
id: start-frontend
title: Start Frontend [F]
description: "Start frontend for an SST app"
---

## Set up frontend

```bash
cd web
npm i
```

## Start up frontend

Open up `package.json`, the `dev` script is prepended with `sst-env --`.

It passes the backend deployed resources, ie. API endpoint, to the frontend as environment variables.

```bash
npm dev
```

Note that if `sst start` has not started up yet, the command 

Go to `localhost:3000` in your browser.

Load articles.

See function logs in the Console.