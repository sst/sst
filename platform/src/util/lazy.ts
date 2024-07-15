export function lazy<T>(callback: () => T) {
  let loaded = false;
  let result: T;

  return () => {
    if (!loaded) {
      result = callback();
      loaded = true;
    }
    return result;
  };
}
