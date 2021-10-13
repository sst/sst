# Contributing to SST

Want to help improve SST? Thank you! Take a second to review this document before you get started.

To be sure that you are not working on something that's already being worked on, make sure to either:

- [Open a new issue][issue] about it
- Or [join us on Slack][slack] and send us a message

## Running Locally

### Clone the repo

To run this project locally, clone the repo and initialize the project.

```bash
$ git clone https://github.com/serverless-stack/serverless-stack.git
$ cd serverless-stack
$ yarn
```

### Resources

If you are working on the `packages/resources` part, run the watcher at the root.

```bash
$ yarn watch
```

And if you make changes to the stub Lambdas, you'll need to package them.

```bash
$ cd packages/resources
$ yarn build
```

Finally, after making your changes, run all the tests in the `packages/resources` directory.

```bash
$ yarn test
```

Alternatively, you can run the tests for a specific construct.

```bash
$ yarn test <path_to_the_test_for_the_construct>
```

### CLI

If you are working on the `packages/cli` just go ahead and make your changes. Then run your tests.

```bash
$ cd packages/cli
$ yarn test
```

Alternatively, you can run a specific test.

```bash
$ yarn test <path_to_the_test_dir>
```

### Docs

To run the docs site.

```bash
$ cd www
$ yarn start
```

## Pull Requests

Make sure to add your changes as a pull request. Start by forking the repo. Then make your changes and submit a PR.

- Use a descriptive name for the PR
- With the format, "[Construct/package name]: [Description]"
- For example, "Api: Add support for HTTP proxy routes"
- Pick a label for the PR from:
  - `breaking`: These are for breaking changes
  - `bug`: Bug fixes
  - `enhancement`: New features
  - `documentation`: Improvements to the docs or examples
  - `skip changelog`: Don't mention this in the release notes

If you are sumbitting the PR for the first time, we'll need to approve it to run the tests.

## Releases

To cut a release, start by merging the PRs that are going into this release.

1. Generate changelog

   ```bash
   $ yarn changelog
   ```

   You'll need to configure the `GITHUB_AUTH` token locally to be able to run this. [Follow these steps](https://github.com/lerna/lerna-changelog#github-token) and configure the local environment variable.

2. Publish a release to npm

   To publish the release to npm run:

   ```bash
   $ yarn release
   ```

   Pick the version you want (patch/minor/major). This is based on the type of changes in the changelog above.

   - `breaking` and major `enhancement` changes are a minor version update
   - `bug` and minor `enhancement` changes are a patch version update

   We are not currently updating the major version until our 1.0 release.

   Verify that only the 5 core packages (`core`, `cli`, `resources`, `create-serverless-stack`, `static-site-env`) are getting published.

   Confirm and publish!

3. Draft a new release

   Copy the changelog that was generated above and [draft a new release](https://github.com/serverless-stack/serverless-stack/releases/new).

   Make necessary edits to the changelog to make it more readable and helpful.

   - For `breaking` changes, add a message at the top clearly documenting the change ([example](https://github.com/serverless-stack/serverless-stack/releases/tag/v0.26.0)).
   - For major `enhancement` changes, add a code snippet on how to use the feature ([example](https://github.com/serverless-stack/serverless-stack/releases/tag/v0.36.0)).

   Add this snippet at the bottom of the changelog and replace it with the version that's going to be released.

   ````
   ---

   Update using:

   ```sh
   $ npm install --save --save-exact @serverless-stack/cli@x.x.x @serverless-stack/resources@x.x.x
   ```
   ````

4. Publish GitHub release

   In the **Tag version** of the release draft, select the version that was just published to npm.

   Copy-paste that version as the **Release title**. And hit **Publish release**.

### Canary Releases

Optionally, you can publish a canary release to npm.

This is useful if you'd like to test your release before pushing it live.

Create a canary release by running.

```bash
$ yarn release-canary
```

## Deprecation

Follow the checklist below when deprecating a Construct property or method.

1. Docs: Label the old property name (or method) as deprecated.
   ```
   oldProp (deprecated)
   ```
2. Docs: Add migration instructions under the old property (or method):

   ~~~
   `oldProp` has been renamed to `newProp` in v0.46.0.
  
   If you are configuring the `oldProp` like so:
   
   ```js
   new Table(this, "Table", {
     ...
     oldProp: "value",
   }
   ```
   
   Change it to:
   
   ```js
   new Table(this, "Table", {
     ...
     newProp: "value",
   }
   ```
   ~~~
   
3. Construct code: Decorate the old property (or method) as deprecated.
   ```
   /**
    * @deprecated Use newProp
    */
   ```
4. Construct code: Ensure the old property (or method) will continue to work.
5. Construct code: Print a warning in verbose mode if the old property (or method) is used.
   ```
   WARNING: The "oldProp" property has been renamed to "newProp". "oldProp" will continue to work but will be removed at a later date. More details on the deprecation - https://docs.serverless-stack.com/constructs/Table#secondaryindexes-deprecated
   ```
6. Construct tests: Ensure tests added for both the old and the new property (or method).

See the `Table` construct for a deprecation example of renaming `secondaryIndexes` to `globalIndexes`.

## Community Team Contribution Workflow

### Gather requirements

When assigned an issue, the first step is to seek necessary clarification. If the issue was brought up by a user, make sure you fully understand the requirement from the user. Otherwise, contact a member from the core team that opened the issue.

### Specing

Do the necessary research. Then draft a plan of the implementation; the cases that need to be tested; and the docs required to be updated. Here is an example:

#### Task: Allow user to customize eslint rules in SST
- [ ] research: how is it currently done in other popular frameworks, ie. Create React App
- [ ] implement: add an eslint section in the package.json to allow users to specify a list of linting packages
- [ ] implement: update create-serverless-stack template to prefill the package.json with SST's default linting package
- [ ] test: add a test with SST's default linting package and check `no-unused-vars` is enforced
- [ ] test: add a test with custom linting packages and check `no-unused-vars` is not enforced
- [ ] doc: document the default linting package in "Working Locally"
- [ ] doc: show an example of customizing linting packages

Add the spec to the GitHub issue. It is necessary to come up with this list before working on the task. This gives the core team a chance to propose changes and. A good spec is one where it can be handed to anyone on the team, and that person is able to follow through and complete the implementation.

If the solution isn’t obvious or is a bigger change, get the core team involved. Before the group discussion, come up with a proposed solution.

The core team reviews the spec.

### Implement

Create a [Pull Request](#pull-requests). Inform the core team upon completion. And the core team will review the PR.

---

Help us improve this doc. If you've had a chance to contribute to SST, feel free to edit this doc and submit a PR.

[slack]: https://launchpass.com/serverless-stack
[issue]: https://github.com/serverless-stack/serverless-stack/issues/new
