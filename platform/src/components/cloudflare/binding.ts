/**
 * The Cloudflare Binding Adapter is used to define Cloudflare bindings associated with the
 * [Linkable resource](./linkable).
 *
 * @example
 *
 * ```ts
 * sst.cloudflare.binding("r2BucketBindings", {
 *   bucketName: "my-bucket",
 * })
 * ```
 *
 * @packageDocumentation
 */

import { Input } from "../input";

export interface KvBinding {
  type: "kvNamespaceBindings";
  properties: {
    namespaceId: Input<string>;
  };
}
export interface SecretTextBinding {
  type: "secretTextBindings";
  properties: {
    text: Input<string>;
  };
}
export interface ServiceBinding {
  type: "serviceBindings";
  properties: {
    service: Input<string>;
  };
}
export interface PlainTextBinding {
  type: "plainTextBindings";
  properties: {
    text: Input<string>;
  };
}
export interface QueueBinding {
  type: "queueBindings";
  properties: {
    queue: Input<string>;
  };
}
export interface R2BucketBinding {
  type: "r2BucketBindings";
  properties: {
    bucketName: Input<string>;
  };
}

export interface D1DatabaseBinding {
  type: "d1DatabaseBindings";
  properties: {
    databaseId: Input<string>;
  };
}

export type Binding =
  | KvBinding
  | SecretTextBinding
  | ServiceBinding
  | PlainTextBinding
  | QueueBinding
  | R2BucketBinding
  | D1DatabaseBinding;

export function binding<T extends Binding["type"]>(
  type: T,
  properties: Extract<Binding, { type: T }>["properties"],
) {
  return {
    type: "cloudflare.binding" as const,
    binding: type,
    properties,
  };
}
