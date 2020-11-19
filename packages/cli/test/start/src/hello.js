exports.handler = function (event, context, callback) {
  console.log("Calling from inside the function");
  setTimeout(() => {
    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: "Hello World with event: " + JSON.stringify(event),
    });
  }, 2000);
};
