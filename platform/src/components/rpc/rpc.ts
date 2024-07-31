import { CustomResourceOptions, dynamic, runtime } from "@pulumi/pulumi";

export module rpc {
  export class MethodNotFoundError extends Error {
    constructor(public method: string) {
      super(`Method "${method}" not found`);
    }
  }
  export async function call(method: string, args: any) {
    return fetch($cli.rpc, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "1.0",
        method,
        params: [args],
      }),
    }).then(async (res) => {
      if (res.status !== 200) {
        throw new Error("Failed to call RPC: " + (await res.text()));
      }
      const json: any = await res.json();
      if (json.error) {
        if (json.error.startsWith("rpc: can't find"))
          throw new MethodNotFoundError(method);
        throw new Error(json.error);
      }
      return json.result;
    });
  }

  export class Provider implements dynamic.ResourceProvider {
    constructor(private type: string) {}
    private name(action: string) {
      return "Resource." + this.type + "." + action;
    }
    async create(inputs: any) {
      return call(this.name("Create"), inputs) as Promise<dynamic.CreateResult>;
    }

    async delete(id: string, outs: any): Promise<void> {
      return call(this.name("Delete"), { id, outs }).catch((ex) => {
        if (ex instanceof MethodNotFoundError) return;
        throw ex;
      });
    }

    async update(id: string, olds: any, news: any) {
      return call(this.name("Update"), { id, olds, news }).catch((ex) => {
        if (ex instanceof MethodNotFoundError)
          return {
            id,
          };
        throw ex;
      });
    }

    async read(id: string, props: any): Promise<dynamic.ReadResult> {
      return call(this.name("Read"), { id, props }).catch((ex) => {
        if (ex instanceof MethodNotFoundError) return { id };
        throw ex;
      });
    }
  }
}
