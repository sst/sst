import retry from "async-retry";
import https from "https";

export function postPayload(endpoint: string, body: any) {
  return (
    retry(
      () => {
        const req = https.request(
          endpoint,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            timeout: 5000,
          },
          (resp) => {
            console.log(resp.headers);
            if (resp.statusCode !== 200) {
              throw new Error(`Unexpected status code: ${resp.statusCode}`);
            }
          }
        );
        req.write(JSON.stringify(body));
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
