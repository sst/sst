export const handler = async (event) => {
  console.log(event);
  return {
    statusCode: 200,
    body: JSON.stringify("Hello from API!"),
  };
};
