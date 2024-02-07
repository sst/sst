---
title: Bucket
description: Reference doc for the `Bucket` component
---

import Segment from '../../../components/tsdoc/Segment.astro';
import Section from '../../../components/tsdoc/Section.astro';
import InlineSection from '../../../components/tsdoc/InlineSection.astro';

The `Bucket` component is a higher level component that makes it easy to create an AWS S3 Bucket.

## Examples

#### Using the minimal config
```ts
new sst.Bucket("MyBucket");
```

#### Enabling public read access
This allows anyone to read files in the bucket. This is useful for hosting public files.
```ts
new sst.Bucket("MyBucket", {
  public: true,
});
```

---

## Constructor

<Segment>
<Section type="signature">
```ts
new Bucket(name, args?, opts?)
```
</Section>

<Section type="parameters">
#### Parameters
- <p><code class="key">name</code> <code class="primitive">string</code></p>
- <p><code class="key">args</code> [<code class="type">BucketArgs</code>](#BucketArgs)</p>
- <p><code class="key">opts</code> [<code class="type">ComponentResourceOptions</code>](https://www.pulumi.com/docs/concepts/options/)</p>
</Section>
</Segment>

## Properties

<Segment>
### arn
<InlineSection>
**Type** <code class="type">Output<<code class="primitive">string</code>></code>
</InlineSection>
The S3 bucket arn.
</Segment>

<Segment>
### name
<InlineSection>
**Type** <code class="type">Output<<code class="primitive">string</code>></code>
</InlineSection>
The S3 bucket name.
</Segment>

<Segment>
### nodes
<InlineSection>
**Type** <code class="type">Object</code>
- <p><code class="key">bucket</code> [<code class="type">BucketV2</code>](https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketv2/)</p>
</InlineSection>
The underlying AWS resources.
</Segment>

## BucketArgs

Arguments for creating a `Bucket` component.
<Segment>
### public?

<InlineSection>
**Type** <code class="type">Input<<code class="primitive">boolean</code>></code>
</InlineSection>

<InlineSection>
**Default** `false` - Files are not publicly accessible
</InlineSection>
Enable public access to the files in the bucket
```js
{
  public: true
}
```
</Segment>
<Segment>
### transform?

<InlineSection>
**Type** <code class="type">Object</code>
- <p><code class="key">bucket</code> <code class="type">Transform<[<code class="type">BucketV2Args</code>](https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketv2args/)></code></p>
- <p><code class="key">bucketPolicy</code> <code class="type">Transform<[<code class="type">BucketPolicyArgs</code>](https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketpolicyargs/)></code></p>
</InlineSection>
</Segment>