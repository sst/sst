exports.handler = function (event, context, callback) {
  console.log("Calling from inside the sns function");
  callback(null, { status: "real" });
};
