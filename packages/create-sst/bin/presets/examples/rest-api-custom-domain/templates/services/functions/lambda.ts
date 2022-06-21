export async function main() {
  const response = {
    userId: 1,
    id: 1,
    title: "delectus aut autem",
    completed: false,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(response, null, "  "),
  };
}
