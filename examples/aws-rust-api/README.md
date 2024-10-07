# Rust Function Url Example

This example uses [cargo lambda](https://www.cargo-lambda.info/) to build rust binaries and deploy them on a provided AL2 runtime

NOTE: (cargo lambda relies on [zig](https://ziglang.org/), which it will prompt to install on first running a cargo lambda command)

```sh
cargo lambda build --release
```

you can also provide the architecture of choice

```sh
cargo lambda build --release --arm64
# or
cargo lambda build --release --x86-64
```

which can then be reflected in the `sst.config.ts`

```ts
const api = new sst.aws.Function("rust-api", {
    architecture: "arm64", // or x86_64
    ...
});
```

by default, cargo lambda will build to a folder in `target/` called `lambda/`. The binary build will be called `bootstrap`, and it will be built in a sub folder which is the name of your binary.

For example, a rust binary `src/bin/handlers/api.rs` will be built to `target/lambda/api/bootstrap`

After building the binary, deploys can be done normally via `sst deploy --stage production`

Other services can be orchestrated in a similar manner with cargo lambda, for example a cron:
```ts
new sst.aws.Cron('MyCron', {
    schedule: 'cron(0 0 * * ? *)',
    job: {
        architecture: 'arm64',
        runtime: 'provided.al2023',
        handler: 'bootstrap',
        bundle: 'target/lambda/my-cron',
    }
});
```

# GHA

An example to deploy using github actions with `arm64` architecture, feel free to configure as needed

```yml
name: Deploy Prod

on:
  push:
    branches:
      - main

jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pguyot/arm-runner-action@v2

      - name: use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: latest

      - name: use pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: use Rust
        uses: actions-rs/toolchain@v1

      - name: use Rust cache
        uses: Swatinem/rust-cache@v2

      - name: use Zig
        uses: korandoru/setup-zig@v1
        with:
          zig-version: master

      - name: use Cargo Lambda
        uses: jaxxstorm/action-install-gh-release@v1.9.0
        with:
          repo: cargo-lambda/cargo-lambda
          platform: linux
          arch: aarch64 # | x86_64

      - name: cargo lint
        run: cargo lint

      - name: pnpm install
        run: pnpm install --frozen-lockfile

      - name: sst install providers
        run: |
          set -euxo pipefail
          pnpm sst install

      - name: build lambdas
        run: |
          set -euxo pipefail
          cargo lambda build --release --arm64

      - name: sst deploy
        run: |
          set -euxo pipefail
          pnpm sst deploy --stage prod

    env:
      STAGE: prod
      LOG_LEVEL: info
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```
