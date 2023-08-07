/**
 * Join an array of strings with a conjunction for the last item
 * @param arr An array of strings
 * @param conjunction A conjunction to use for the last item in the array
 * @returns A humanized string of the array
 * @example humanizeArrayString(["a", "b", "c"], "and") // "a, b, and c"
 * @example humanizeArrayString(["a", "b"], "or") // "a or b"
 * @example humanizeArrayString(["a"], "or") // "a"
 */
export const humanizeArrayString = (arr: string[], conjunction: string) => {
    if (arr.length === 0) {
      return "";
    }
  
    if (arr.length === 1) {
      return arr[0];
    }
  
    if (arr.length === 2) {
      return `${arr[0]} ${conjunction} ${arr[1]}`;
    }
  
    return `${arr.slice(0, -1).join(", ")}, ${conjunction} ${arr.slice(-1)}`;
  }