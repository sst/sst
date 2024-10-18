import { increment } from "./common.mjs";

export const handler = async () => {
  const counter = await increment();
  console.log("COUNTER", counter);
  return {
    statusCode: 200,
    body: JSON.stringify({
      counter,
    }),
  };
};
