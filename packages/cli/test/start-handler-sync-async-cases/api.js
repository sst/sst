export function main() {
  throw 123;
}

////////////////////////////////////////////////
// Browser shows "Hello World" after 1 second
////////////////////////////////////////////////
export async function case_async_after_1s() {
  setTimeout(() => {}, 999999);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ statusCode: 200, body: "Hello World" });
    }, 1000);
  });
}

////////////////////////////////////////////////
// Browser shows "Hello World" right away
////////////////////////////////////////////////
export async function case_async_immediately_1() {
  setTimeout(() => {}, 999999);

  return { statusCode: 200, body: "Hello World" };
}

////////////////////////////////////////////////
// Browser shows "Hello World" after 5 seconds
////////////////////////////////////////////////
export function case_cb_after_5s_1(_event, context, callback) {
  setTimeout(() => {
    callback(null, { statusCode: 200, body: "Hello World" });
  }, 1000);

  setTimeout(() => {
    console.log("Timeout complete");
  }, 5000);
}

export function case_cb_after_5s_2(_event, _context, callback) {
  callback(null, { statusCode: 200, body: "Hello World" });

  setTimeout(() => {
    console.log("Timeout complete");
  }, 5000);
}

////////////////////////////////////////////////
// Browser shows "Hello World" after 1 second
////////////////////////////////////////////////
export function case_cb_after_1s_1(_event, _context, callback) {
  setTimeout(() => {
    callback(null, { statusCode: 200, body: "Hello World" });
  }, 1000);

  return { statusCode: 200, body: "Hey" };
}

export function case_cb_after_1s_2(_event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;

  setTimeout(() => {
    callback(null, { statusCode: 200, body: "Hello World" });
  }, 1000);

  return { statusCode: 200, body: "Hey" };
}

export function case_cb_after_1s_3(_event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;

  setTimeout(() => {
    callback(null, { statusCode: 200, body: "Hello World" });
  }, 1000);

  setTimeout(() => {
    console.log("Timeout complete");
  }, 5000);
}

////////////////////////////////////////////////
// Browser shows "null" after 5 seconds
////////////////////////////////////////////////
export function case_cb_null_after_5s() {
  setTimeout(() => {
    console.log("Timeout complete");
  }, 5000);

  return { statusCode: 200, body: "Hey" };
}

////////////////////////////////////////////////
// Browser shows "null" immediately
////////////////////////////////////////////////
export function case_cb_null_immediately() {
  return { statusCode: 200, body: "Hey World" };
}

////////////////////////////////////////////////
// Browser shows {"message":"Internal Server Error"} after 10 seconds (Lambda timeout)
////////////////////////////////////////////////
export function case_cb_timeout(_event, context, callback) {
  setTimeout(() => {
    callback(null, { statusCode: 200, body: "Hello World" });
  }, 1000);

  setTimeout(() => {
    console.log("Timeout complete");
  }, 999999);
}
