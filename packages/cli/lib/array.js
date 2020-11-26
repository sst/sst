export function unique(arr) {
  if (arr.length === 0) {
    return arr;
  }

  const isObjArray = arr[0] instanceof Object;
  arr = isObjArray ? arr.map((e) => JSON.stringify(e)) : arr;

  const unique = arr.filter((e, pos) => arr.indexOf(e) === pos);

  return isObjArray ? unique.map((e) => JSON.parse(e)) : unique;
}
