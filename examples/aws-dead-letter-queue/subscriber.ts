export const main = async (event) => {
  console.log(event);
  throw new Error("Manual error");
};

export const dlq = async (event) => {
  console.log(event);
  return "ok";
};
