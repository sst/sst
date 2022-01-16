import retry from "async-retry";
import https from "https";

export function postPayload(endpoint: string, body: any) {
  return (
    retry(
      () => {
        return new Promise<void>((resolve, reject) => {
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
        });
      },
      { minTimeout: 500, retries: 1, factor: 1 }
    )
      .catch(() => {
        // We swallow errors when telemetry cannot be sent
      })
      // Ensure promise is voided
      .then(
        () => {
          return;
        },
        () => {
          return;
        }
      )
  );
}
