import https from "https";

export function postPayload(endpoint: string, body: any) {
  return new Promise<void>((resolve, reject) => {
    try {
      const req = https.request(
        endpoint,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          timeout: 5000,
        },
        (resp) => {
          if (resp.statusCode !== 200) {
            reject(new Error(`Unexpected status code: ${resp.statusCode}`));
            return;
          }
          resolve();
        }
      );
      req.write(JSON.stringify(body));
      req.end();
    } catch {
      resolve();
    }
  });
}
