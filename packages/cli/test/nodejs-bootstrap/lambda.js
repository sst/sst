exports.fnAsync = async function () {
  return "hi";
};

exports.fnSync_CallbackCalled = function (event, context, callback) {
  callback(null, "hi");
};

exports.fnSync_CallbackCalled_PendingEventLoop_WaitTrue = function (
  event,
  context,
  callback
) {
  context.callbackWaitsForEmptyEventLoop = true;
  setTimeout(() => {}, 10);
  callback(null, "hi");
};

exports.fnSync_CallbackCalled_PendingEventLoop_WaitFalse = function (
  event,
  context,
  callback
) {
  context.callbackWaitsForEmptyEventLoop = false;
  setTimeout(() => {}, 10);
  callback(null, "hi");
};

exports.fnSync_CallbackNotCalled = function () {};

exports.fnSync_CallbackWillCall = function (event, context, callback) {
  setTimeout(() => callback(null, "hi"), 10);
};
