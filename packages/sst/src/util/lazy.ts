export function lazy<T>(callback: () => T) {
  let loaded = false;
  let result: T;

  return () => {
    if (!loaded || process.env.SST_RESET_LAZY) {
      result = callback();
      loaded = true;
    }
    return result;
  };
}
