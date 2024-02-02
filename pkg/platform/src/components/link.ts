import { Input, Output, runtime } from "@pulumi/pulumi";
import { FunctionPermissionArgs } from "./function.js";
import { VisibleError } from "./error.js";

export module Link {
  export interface Definition {
    value: Input<any>;
    type: string;
  }

  let links: Record<string, any> = {};
  export function reset() {
    links = {};
    runtime.registerStackTransformation((args) => {
      const resource = args.resource;
      process.nextTick(() => {
        if (Link.isLinkable(resource)) {
          // Ensure linkable resources have unique names. This includes all
          // SST components and non-SST components that are linkable.
          if (links[args.name]) {
            throw new Error(`Component name ${args.name} is not unique`);
          }

          const link = resource.getSSTLink();
          links[args.name] = link.value;
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

  export function build(links: Definition[]) {
    return links.map((l) => {
      if (isLinkable(l)) {
        const link = l.getSSTLink();
        return {
          name: l.urn.apply((x) => x.split("::").at(-1)!),
          value: link.value,
          type: link.type,
        };
      }
      throw new VisibleError(`${l} is not a linkable component`);
    });
  }

  export function makeLinkable<T>(
    obj: { new (...args: any[]): T },
    cb: (this: T) => Definition
  ) {
    obj.prototype.getSSTLink = cb;
  }

  export function list() {
    return links;
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
      cb: (this: T) => FunctionPermissionArgs[]
    ) {
      obj.prototype.getSSTAWSPermissions = cb;
    }
  }

  export module Receiver {
    let receivers: Record<string, Input<string[]>> = {};
    export function register(directory: string, links: Input<string[]>) {
      receivers[directory] = links;
    }

    export function list() {
      return receivers;
    }
  }
}
