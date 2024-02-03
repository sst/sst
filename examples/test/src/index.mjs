export async function handler() {
  let size = 10;
  let char = "a";
  let largeString = char.repeat(size);
  return {
    statusCode: 200,
    body: largeString,
  };
}
