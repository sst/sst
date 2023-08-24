# Contributing to SST

Want to help improve SST? Thank you! Take a second to review this document before you get started.

To be sure that you are not working on something that's already being worked on, make sure to either:

- [Open a new issue][issue] about it
- Or [join us on Discord][discord] and send us a message

## How to Contribute

In this section we'll talk about the workflow we recommend while working on SST. It's based on how we work internally, but catered specifically for our community contributors. For more context on how we work, you can [check out this document](https://sst.dev/about/culture.html).

### 1. Gather Requirements

When assigned an issue, the first step is to get all the details and seek any necessary clarification. If the issue was brought up by a user, make sure you fully understand the requirement from the user. Contact the user on Discord or ask them on GitHub. Or, contact a member from the core team that opened the issue.

### 2. Speccing

Next, do the necessary research. Draft a plan for the implementation; the cases that need to be tested; and the docs required to be updated.

Here is an example of a spec in action:

#### Example Task: Allow users to customize eslint rules in SST

- [ ] Research: How is it currently done in other popular frameworks, ie. Create React App.
- [ ] Implement: Add an eslint section in the `package.json` to allow users to specify a list of linting packages.
- [ ] Implement: Update the `create-sst` template to prefill the `package.json` with SST's default linting package.
- [ ] Test: Add a test with SST's default linting package and check the `no-unused-vars` rule is enforced.
- [ ] Test: Add a test with custom linting packages and check that the `no-unused-vars` rule is not enforced.
- [ ] Doc: Document the default linting package in "Working Locally" doc.
- [ ] Doc: Show an example of customizing linting packages.

Then, add the spec to the GitHub issue. It's necessary to come up with this list **before** working on the task. This gives the core team a chance to propose changes. And, a good spec is one where it can be handed to anyone on the team. That person is then able to follow through and complete the implementation.

If the solution isn’t obvious or is a bigger design change, get the core team involved. Before the group discussion, come up with a proposed solution. [More on this here](https://sst.dev/about/culture.html#our-design-process).

The core team then reviews the spec.

### 3. Implement

Create a [Pull Request](#pull-requests). Inform the core team upon completion. And the core team will review the PR and merge it.

---

## Running Locally

Here's how to run SST locally.

### Clone the repo

To run this project locally, clone the repo and initialize the project.

```bash
$ git clone https://github.com/sst/sst.git
$ cd sst
$ pnpm install
```

Build the project

```bash
$ pnpm build
```

### SST

If you are working on the `packages/sst` part, run the watcher at the root.

```bash
$ pnpm watch
```

Finally, after making your changes, run all the tests in the `packages/sst` directory.

```bash
$ pnpm test
```

Alternatively, you can run the tests for a specific construct.

```bash
$ pnpm test <path_to_the_test_for_the_construct>
```

### Console

If you are working on the `packages/console` just go ahead and make your changes. Then run your tests.

```bash
$ cd packages/console
$ pnpm test
```

Alternatively, you can run a specific test.

```bash
$ pnpm test <path_to_the_test_dir>
```

### Docs

To run the docs site.

```bash
$ cd www
$ pnpm build
$ pnpm start
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

If you are submitting the PR for the first time, we'll need to approve it to run the tests.

## Releases

To cut a release, start by merging the PRs that are going into this release.

1. Generate changelog

   ```bash
   $ pnpm changelog
   ```

   You'll need to configure the `GITHUB_AUTH` token locally to be able to run this. [Follow these steps](https://github.com/lerna/lerna-changelog#github-token) and configure the local environment variable.

2. Publish a release to npm

   To publish the release to npm run:

   ```bash
   $ pnpm release
   ```

   Pick the version you want (patch/minor/major). This is based on the type of changes in the changelog above.

   - `breaking` and major `enhancement` changes are a minor version update
   - `bug` and minor `enhancement` changes are a patch version update

   We are not currently updating the major version until our 1.0 release.

   Verify that only the 5 core packages (`core`, `cli`, `resources`, `create-sst`, `static-site-env`) are getting published.

   Confirm and publish!

3. Draft a new release

   Copy the changelog that was generated above and [draft a new release](https://github.com/sst/sst/releases/new).

   Make necessary edits to the changelog to make it more readable and helpful.

   - For `breaking` changes, add a message at the top clearly documenting the change ([example](https://github.com/sst/sst/releases/tag/v0.26.0)).
   - For major `enhancement` changes, add a code snippet on how to use the feature ([example](https://github.com/sst/sst/releases/tag/v0.36.0)).

   Add this snippet at the bottom of the changelog and replace it with the version that's going to be released.

   ````
   ---

   Update using:

   ```sh
   $ npm install --save --save-exact @sst/cli@x.x.x @sst/resources@x.x.x
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
$ pnpm release-canary
```

## Deprecation

Follow the checklist below when deprecating a Construct property or method.

1. Docs: Label the old property name (or method) as deprecated.
   ```
   oldProp (deprecated)
   ```
2. Docs: Add migration instructions under the old property (or method):

   ````
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
   ````

3. Construct code: Decorate the old property (or method) as deprecated.
   ```
   /**
    * @deprecated Use newProp
    */
   ```
4. Construct code: Ensure the old property (or method) will continue to work.
5. Construct code: Print a warning in verbose mode if the old property (or method) is used.
   ```
   WARNING: The "oldProp" property has been renamed to "newProp". "oldProp" will continue to work but will be removed at a later date. More details on the deprecation - https://docs.sst.dev/constructs/Table#secondaryindexes-deprecated
   ```
6. Construct tests: Ensure tests added for both the old and the new property (or method).

See the `Table` construct for a deprecation example of renaming `secondaryIndexes` to `globalIndexes`.

---

Help us improve this doc. If you've had a chance to contribute to SST, feel free to edit this doc and submit a PR.

[discord]: https://sst.dev/discord
[issue]: https://github.com/sst/sst/issues/new
