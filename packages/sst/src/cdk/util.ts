export async function callWithRetry<T>(cb: () => Promise<T>): Promise<T> {
  try {
    return await cb();
  } catch (e: any) {
    if (
      (e.code === "ThrottlingException" && e.message === "Rate exceeded") ||
      (e.code === "Throttling" && e.message === "Rate exceeded") ||
      (e.code === "TooManyRequestsException" &&
        e.message === "Too Many Requests") ||
      e.code === "OperationAbortedException" ||
      e.code === "TimeoutError" ||
      e.code === "NetworkingError"
    ) {
      return await callWithRetry(cb);
    }
    throw e;
  }
}
