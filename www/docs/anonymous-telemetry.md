---
id: anonymous-telemetry
title: Anonymous Telemetry
description: "SST collects completely anonymous telemetry data about general usage. You can opt-out of this program at any time."
---

SST collects completely **anonymous** telemetry data about general usage. Participation in this anonymous program is optional, and you cant opt-out if you'd not like to share any information.

### How do I opt-out?

You can opt out-by running the following in the root of your project:

```bash
npx sst telemetry disable
```

You can also check the status of telemetry collection at any time by running `sst telemetry` in the root.

```bash
npx sst telemetry
```

You can re-enable telemetry if you'd like to rejoin the program by running.

```bash
npx sst telemetry enable
```

You can also opt-out by setting an environment variable: `SST_TELEMETRY_DISABLED=1`.

### Why is telemetry collected?

SST has grown considerably since its release. Prior to telemetry collection, our improvement process has been very much a manual one.

Telemetry allows us to accurately gauge SST feature usage, pain points, and customization across all users. This data will let us better tailor SST to a broader audience, ensuring its continued growth and best-in-class developer experience.

It also allows us to verify if the improvements made to SST are improving the baseline for all applications.

### What is being collected?

We track the following anonymously:

- Command invoked (ie. `sst build`, `sst start`, or `sst deploy`)
- Version of SST in use
- General machine information (e.g. number of CPUs, macOS/Windows/Linux, whether or not the command was run within CI)

Note, this list is regularly audited to ensure its accuracy.

An example telemetry event looks like:

```json
{
  "name": "CLI_COMMAND",
  "properties": {
    "command": "start"
  }
}
```

These events are then sent to an endpoint hosted on our side. You can view the source for the service that stores the telemetry events in this repo: [`serverless-stack/telemetry`](https://github.com/serverless-stack/telemetry)

### What about sensitive data or secrets?

We **do not** collect any metrics which may contain sensitive data.

This includes, but is not limited to: environment variables, file paths, contents of files, logs, or serialized JavaScript errors.

We take your privacy and our security very seriously.

### Will this data be shared?

The data we collect is completely anonymous, not traceable to the source, and only meaningful in aggregate form.

No data we collect is personally identifiable.

In the future, we plan to share relevant data with the community through public dashboards or reports.
