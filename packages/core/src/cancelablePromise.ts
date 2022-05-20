export function makeCancelable(promise: any, onCancel: any) {
  let hasCanceled_ = false;

  function cancelError() {
    return { cancelled: true };
  }

  const wrappedPromise: any = new Promise((resolve, reject) => {
    promise.then(
      // Don't do anything if cancelled
      (val: any) => (hasCanceled_ ? reject(cancelError()) : resolve(val)),
      (error: any) => (hasCanceled_ ? reject(cancelError()) : reject(error))
    );
  });

  wrappedPromise.cancel = function () {
    onCancel && onCancel();
    hasCanceled_ = true;
  };

  return wrappedPromise;
}
