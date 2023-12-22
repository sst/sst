## Installation

#### macOS

`sst` is available via a Homebrew Tap, and as downloadable binary from the [releases](https://github.com/sst/ion/releases/latest) page:

```
brew install sst/tap/sst
```

To upgrade to the latest version:

```
brew upgrade sst
```

#### Linux

`sst` is available as downloadable binaries from the [releases](https://github.com/sst/ion/releases/latest) page. Download the .deb or .rpm from the [releases](https://github.com/sst/ion/releases/latest) page and install with `sudo dpkg -i` and `sudo rpm -i` respectively.

For arch linux it's available in the [aur](https://aur.archlinux.org/packages/sst-bin)

#### Windows

`sst` is available via [scoop](https://scoop.sh/), and as a downloadable binary from the [releases](https://github.com/sst/ion/releases/latest) page:

```
scoop bucket add sst https://github.com/planetscale/scoop-bucket.git
scoop install sst mysql
```

To upgrade to the latest version:

```
scoop update sst
```

#### Manually

Download the pre-compiled binaries from the [releases](https://github.com/sst/ion/releases/latest) page and copy to the desired location.

## Quick start

1. Create a new Next.js app.

   ```bash
   npx create-next-app@latest
   ```

2. Initialize SST in the root of your Next.js app.

   ```bash
   cd my-app
   sst create
   ```

3. Deploy!

   ```bash
   sst deploy
   ```

## Custom domains

You can configure the app with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/).

```js {3}
new Nextjs("Web", {
  domain: "my-app.com",
});
```

You can setup `www.my-app.com` redirect to `my-app.com`.

```js {3}
new Nextjs("Web", {
  domain: {
    domainName: "my-app.com",
    redirects: ["www.my-app.com"],
  },
});
```

Or you can have `www.my-app.com` serve out the same site without redirecting.

```js {3}
new Nextjs("Web", {
  domain: {
    domainName: "my-app.com",
    aliases: ["www.my-app.com"],
  },
});
```
