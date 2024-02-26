export const handler = async (event) => {
  console.log(event);
  return {
    statusCode: 200,
    body: JSON.stringify({ route: event.routeKey, status: "ok" }, null, 2),
  };
};
