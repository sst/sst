//import { Resource } from "sst";
//import type { Router } from "./index";

export default {
  async fetch(request: Request): Promise<Response> {
    return new Response("Hello World");
  },
};

