import {
  Input,
  Output,
  runtime,
  output,
  all,
  ComponentResource,
} from "@pulumi/pulumi";

export module Link {
  export interface Definition<
    Properties extends Record<string, any> = Record<string, any>,
  > {
    properties: Properties;
    include?: {
      type: string;
      [key: string]: any;
    }[];
  }

  export class Ref extends ComponentResource {
    constructor(target: string, type: string, properties: any) {
      super(
        "sst:sst:LinkRef",
        target + "LinkRef",
        {
          properties,
        },
        {},
      );
      this.registerOutputs({
        target: target,
        properties: {
          type: type.replaceAll(":", "."),
          ...properties,
        },
      });
    }
  }

  export function reset() {
    const links = new Set<string>();
    runtime.registerStackTransformation((args) => {
      const resource = args.resource;
      process.nextTick(() => {
        if (Link.isLinkable(resource) && !args.opts.parent) {
          // Ensure linkable resources have unique names. This includes all
          // SST components and non-SST components that are linkable.
          if (links.has(args.name)) {
            throw new Error(`Component name ${args.name} is not unique`);
          }
          const link = resource.getSSTLink();
          new Ref(args.name, args.type, link.properties);
          links.add(args.name);
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
      .map((l: Linkable) => {
        const link = l.getSSTLink();
        return all([l.urn, link]).apply(([urn, link]) => ({
          name: urn.split("::").at(-1)!,
          properties: {
            ...link.properties,
            type: urn.split("::").at(-2),
          },
        }));
      });
  }

  export function getInclude<T>(
    type: string,
    input?: Input<any[]>,
  ): Output<T[]> {
    if (!input) return output([]);
    return output(input).apply((links) => {
      return links.filter(isLinkable).flatMap((l: Linkable) => {
        const link = l.getSSTLink();
        return (link.include || []).filter((i) => i.type === type) as T[];
      });
    });
  }

  /** @deprecated
   * Use sst.Linkable.wrap instead.
   */
  export function linkable<T>(
    obj: { new (...args: any[]): T },
    cb: (resource: T) => Definition,
  ) {
    console.warn("sst.linkable is deprecated. Use sst.Linkable.wrap instead.");
    obj.prototype.getSSTLink = function () {
      return cb(this);
    };
  }
}
