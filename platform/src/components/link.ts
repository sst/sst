import {
  Input,
  Output,
  runtime,
  output,
  all,
  ComponentResource,
} from "@pulumi/pulumi";
import { FunctionPermissionArgs } from "./aws/function.js";

export module Link {
  export interface Definition {
    properties: Input<Record<string, any>>;
  }

  class LinkRef extends ComponentResource {
    constructor(target: string, properties: any) {
      super(
        "sst:sst:LinkRef",
        target + "LinkRef",
        {
          properties,
        },
        {},
      );
      this.registerOutputs({
        target: output(target),
        properties: output(properties),
      });
    }
  }

  let links: Record<string, Record<string, any>> = {};
  export function reset() {
    links = {};
    runtime.registerStackTransformation((args) => {
      const resource = args.resource;
      process.nextTick(() => {
        if (Link.isLinkable(resource) && !args.opts.parent) {
          // Ensure linkable resources have unique names. This includes all
          // SST components and non-SST components that are linkable.
          if (links[args.name]) {
            throw new Error(`Component name ${args.name} is not unique`);
          }
          const link = resource.getSSTLink();
          new LinkRef(args.name, link.properties);
        }
      });
      return {
        opts: args.opts,
        props: args.props,
      };
    });
  }

  export interface Linkable {
    urn: Output<string>;
    getSSTLink(): Definition;
  }

  export function isLinkable(obj: any): obj is Linkable {
    return "getSSTLink" in obj;
  }

  export function build(links: any[]) {
    return links
      .filter((l) => isLinkable(l))
      .map((l) => {
        const link = l.getSSTLink();
        return all([l.urn, link.properties]).apply(([urn, properties]) => ({
          name: urn.split("::").at(-1)!,
          properties: {
            ...properties,
            type: urn.split("::").at(-2)!,
          },
        }));
      });
  }

  export function makeLinkable<T>(
    obj: { new (...args: any[]): T },
    cb: (resource: T) => Definition,
  ) {
    obj.prototype.getSSTLink = function () {
      return cb(this);
    };
  }

  export function list() {
    return links;
  }

  export module Cloudflare {
    export type Binding =
      | {
          type: "kvNamespaceBindings";
          properties: {
            namespaceId: Input<string>;
          };
        }
      | {
          type: "serviceBindings";
          properties: {
            service: Input<string>;
          };
        }
      | {
          type: "secretTextBindings";
          properties: {
            text: Input<string>;
          };
        }
      | {
          type: "plainTextBindings";
          properties: {
            text: Input<string>;
          };
        }
      | {
          type: "queueBindings";
          properties: {
            queue: Input<string>;
          };
        }
      | {
          type: "r2BucketBindings";
          properties: {
            bucketName: Input<string>;
          };
        }
      | {
          type: "d1DatabaseBindings";
          properties: {
            databaseId: Input<string>;
          };
        };
    export interface Linkable {
      urn: Output<string>;
      getCloudflareBinding(): Binding;
    }

    export function isLinkable(obj: any): obj is Linkable {
      return "getCloudflareBinding" in obj;
    }
  }

  export module AWS {
    export interface Linkable {
      getSSTAWSPermissions(): FunctionPermissionArgs[];
    }

    export function isLinkable(obj: any): obj is Linkable {
      return "getSSTAWSPermissions" in obj;
    }

    export function makeLinkable<T>(
      obj: { new (...args: any[]): T },
      cb: (this: T) => FunctionPermissionArgs[],
    ) {
      obj.prototype.getSSTAWSPermissions = cb;
    }
  }
}
