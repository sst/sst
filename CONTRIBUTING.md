# Contributing to SST

Want to help improve SST? Thank you! Take a second to review this document before you get started.

There are two key areas that we could use your help with.

- Covering specific cases and setups
- Improving the documentation

To make sure that you are not working on something that's already being worked on, make sure to either:

- [Open a new issue][issue] about it
- Or [join us on Slack][slack] and send us a message

## Running Locally

To run this project locally, clone the repo and initialize the project.

```bash
$ git clone https://github.com/serverless-stack/serverless-stack.git
$ cd serverless-stack
$ yarn
```

### Resources

If you are working on the `packages/resources` part, run the watcher.

```bash
$ cd packages/resources
$ yarn watch
```

And if you make changes to the stub Lambdas, you'll need to package them.

```bash
$ yarn build
```

### Running tests

Finally, after making your changes, run all the tests at the repo root.

```bash
$ yarn test
```

### Docs

To run the docs site.

```bash
$ cd www
$ yarn start
```

## Releases

To cut a release, follow these steps.

1. Generate changelog

   ```bash
   $ yarn changelog
   ```

   You'll need to configure the `GITHUB_AUTH` token locally to be able to run this. [Follow these steps](https://github.com/lerna/lerna-changelog#github-token) and configure the local environment variable.

2. Draft a new release

   Then copy the changelog that's generated and [draft a new release](https://github.com/serverless-stack/serverless-stack/releases/new).

   Make necessary edits to the changelog to make it more readable and helpful.

   Add this snippet at the bottom of the changelog and replace it with the version that's going to be released.

   ````
   ---

   Update using:

   ```sh
   $ npm install --save --save-exact @serverless-stack/cli@x.x.x @serverless-stack/resources@x.x.x
   ```
   ````

   Leave the draft as-is for now.

3. (Optional) Publish a canary release to npm

   If you'd like to test your release before pushing it live, create a canary release by running.

   ```bash
   $ yarn release-canary
   ```

4. Publish a release to npm

   To publish the release to npm run:

   ```bash
   $ yarn release
   ```

   Pick the version you want (patch/minor/major) based on the type of changes in the changelog above.

   Verify that only the 4 core packages (`core`, `cli`, `resources`, `create-serverless-stack`) are getting published.

   Confirm and publish!

5. Publish GitHub release

   Head back to the release draft from before. In the **Tag version** select the version that was just published to npm.

   Copy-paste that version as the **Release title**. And hit **Publish release**.

   Optionally, tweet this out!

---

Help us improve this doc. If you've had a chance to contribute to SST, feel free to edit this doc and submit a PR.

[slack]: https://launchpass.com/serverless-stack
[issue]: https://github.com/serverless-stack/serverless-stack/issues/new
