import { Input } from "../input";

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

export function binding<T extends Binding["type"]>(
  type: T,
  properties: Extract<
    Binding,
    {
      type: T;
    }
  >["properties"],
) {
  return {
    type: "cloudflare.binding" as const,
    binding: type,
    properties,
  };
}
