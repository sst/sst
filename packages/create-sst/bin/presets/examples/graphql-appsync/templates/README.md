# How to create a GraphQL API with AWS AppSync

An example serverless app created with SST.

## Getting Started

[**Read the tutorial**](https://sst.dev/examples/how-to-create-a-serverless-graphql-api-with-aws-appsync.html)

Install the example.

```bash
$ npx create-sst@latest --template=examples/graphql-appsync
# Or with Yarn
$ yarn create sst --template=examples/graphql-appsync
```

Start the Live Lambda Development environment.

```bash
$ npm sst start
```

Once your local environment is ready, [head over to the AppSync console](https://console.aws.amazon.com/appsync).

Here you can run queries and mutations and make changes locally to test your Lambda resolvers.

```graphql
mutation createNote {
  createNote(note: { id: "001", content: "My note" }) {
    id
    content
  }
}

query getNoteById {
  getNoteById(noteId: "001") {
    id
    content
  }
}

query listNotes {
  listNotes {
    id
    content
  }
}

mutation updateNote {
  updateNote(note: { id: "001", content: "My updated note" }) {
    id
    content
  }
}

mutation deleteNote {
  deleteNote(noteId: "001")
}
```

## Commands

### `npm run start`

Starts the local Lambda development environment.

### `npm run build`

Build your app and synthesize your stacks.

Generates a `.build/` directory with the compiled files and a `.build/cdk.out/` directory with the synthesized CloudFormation stacks.

### `npm run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy a specific stack.

### `npm run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally remove a specific stack.

### `npm run test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

## Documentation

Learn more about SST.

- [Docs](https://docs.sst.dev)
- [sst](https://docs.sst.dev/packages/sst)

## Community

[Follow us on Twitter](https://twitter.com/sst_dev) or [post on our forums](https://discourse.sst.dev).
