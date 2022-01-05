---
id: telemetry
title: Telemetry
description: "Known issues with AWS CDK and Serverless Stack (SST)"
---

SST collects completely anonymous telemetry data about general usage. Participation in this anonymous program is optional, and you may opt-out if you'd not like to share any information.

### Why Is Telemetry Collected?

SST has grown considerably since its release. Prior to telemetry collection, our improvement process has been very much a manual one.

Telemetry allows us to accurately gauge SST feature usage, pain points, and customization across all users. This data will let us better tailor SST to the masses, ensuring its continued growth, relevance, and best-in-class developer experience.

Furthermore, this will allow us to verify if improvements made to the framework are improving the baseline of all applications.

### What Is Being Collected?

We track the following anonymously:

- Command invoked (ie. `sst build`, `sst start`, or `sst deploy`)
- Version of SST
- General machine information (e.g. number of CPUs, macOS/Windows/Linux, whether or not the command was run within CI)

Note: This list is regularly audited to ensure its accuracy.

An example telemetry event looks like this:

```json
{
  "name": "CLI_COMMAND",
  "properties": {
    "command": "start"
  }
}
```

### What about Sensitive Data (e.g. Secrets)?

We **do not** collect any metrics which may contain sensitive data.

This includes, but is not limited to: environment variables, file paths, contents of files, logs, or serialized JavaScript errors.

We take your privacy and our security very seriously.

### Will This Data Be Shared?

The data we collect is completely anonymous, not traceable to the source, and only meaningful in aggregate form.

No data we collect is personally identifiable.

In the future, we plan to share relevant data with the community through public dashboards (or similar data representation formats).

### How Do I Opt-Out?

You may opt out-by running `sst telemetry disable` in the root of your project directory:

```bash
npx sst telemetry disable
```
You may check the status of telemetry collection at any time by running `sst telemetry` in the root of your project directory:

```bash
npx sst telemetry
```
You may re-enable telemetry if you'd like to re-join the program by running the following in the root of your project directory:

```bash
npx sst telemetry enable
```
You may also opt-out by setting an environment variable: `SST_TELEMETRY_DISABLED=1`.