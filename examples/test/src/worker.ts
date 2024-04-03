export default {
  async fetch(request: Request): Promise<Response> {
    return new Response("cool", {
      headers: {
        "content-type": "text/plain",
      },
    });
  },
};
