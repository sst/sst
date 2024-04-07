import type { Context, Hono } from "hono";
import { KeyLike } from "jose";

export type Adapter<Properties = any> = (
  route: AdapterRoute,
  options: AdapterOptions<Properties>,
) => void;

export type AdapterRoute = Hono;
export interface AdapterOptions<Properties> {
  name: string;
  algorithm: string;
  encryption: {
    publicKey: () => Promise<KeyLike>;
    privateKey: () => Promise<KeyLike>;
  };
  signing: {
    publicKey: () => Promise<KeyLike>;
    privateKey: () => Promise<KeyLike>;
  };
  success: (ctx: Context, properties: Properties) => Promise<Response>;
  forward: (ctx: Context, response: Response) => Response;
  cookie: (ctx: Context, key: string, value: string, maxAge: number) => void;
}

export class AdapterError extends Error {}
export class AdapterUnknownError extends AdapterError {}
