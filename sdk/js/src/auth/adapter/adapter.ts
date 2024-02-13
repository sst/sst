import type { Context, Hono } from "hono";
export type Adapter<Properties> = (
  route: AdapterRoute,
  options: AdapterOptions<Properties>,
) => void;

export type AdapterRoute = Hono;
export interface AdapterOptions<Properties> {
  name: string;
  success: (ctx: Context, properties: Properties) => Promise<Response>;
  forward: (ctx: Context, response: Response) => Response;
}

export class AdapterError extends Error {}
export class AdapterUnknownError extends AdapterError {}
