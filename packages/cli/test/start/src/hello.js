setTimeout(() => console.log("still here"), 3000);

exports.handler = function (event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = true;
  console.log("Calling from inside the function");
  setTimeout(() => {
    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: "Hello World with event: " + JSON.stringify(event),
    });
  }, 2000);
};
