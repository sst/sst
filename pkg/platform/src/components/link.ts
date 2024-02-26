import { Input, Output, runtime, output, all } from "@pulumi/pulumi";
import { FunctionPermissionArgs } from "./aws/function.js";
import { VisibleError } from "./error.js";

export module Link {
  export interface Definition {
    properties: Input<Record<string, any>>;
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
          links[args.name] = output(link.properties).apply((props) => ({
            type: args.type.replaceAll(":", "."),
            ...props,
          }));
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
    return links.map((l) => {
      if (isLinkable(l)) {
        const link = l.getSSTLink();
        return all([l.urn, link.properties]).apply(([urn, properties]) => ({
          name: urn.split("::").at(-1)!,
          properties: {
            ...properties,
            type: urn.split("::").at(-2)!,
          },
        }));
      }
      throw new VisibleError(`${l} is not a linkable component`);
    });
  }

  export function makeLinkable<T>(
    obj: { new (...args: any[]): T },
    cb: (this: T) => Definition,
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
      cb: (this: T) => FunctionPermissionArgs[],
    ) {
      obj.prototype.getSSTAWSPermissions = cb;
    }
  }

  export module Receiver {
    let receivers: Record<
      string,
      {
        links: Input<string[]>;
        environment: Record<string, Input<string>>;
      }
    > = {};
    export function register(
      directory: string,
      links: Input<string[]>,
      environment: Record<string, Input<string>>,
    ) {
      receivers[directory] = {
        links,
        environment,
      };
    }

    export function list() {
      return receivers;
    }
  }
}
