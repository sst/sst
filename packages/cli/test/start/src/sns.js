exports.handler = async function () {
  console.log("Calling from inside the sns function");
  return { status: true };
};
