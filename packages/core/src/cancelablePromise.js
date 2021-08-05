function makeCancelable(promise, onCancel) {
  let hasCanceled_ = false;

  function cancelError() {
    return { cancelled: true };
  }

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      // Don't do anything if cancelled
      (val) => (hasCanceled_ ? reject(cancelError()) : resolve(val)),
      (error) => (hasCanceled_ ? reject(cancelError()) : reject(error))
    );
  });

  wrappedPromise.cancel = function () {
    onCancel && onCancel();
    hasCanceled_ = true;
  };

  return wrappedPromise;
}

module.exports = {
  makeCancelable,
};
