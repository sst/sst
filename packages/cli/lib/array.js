function diff(oldList, newList) {
  const remove = [];
  const add = [];

  oldList.forEach((item) => newList.indexOf(item) === -1 && remove.push(item));
  newList.forEach((item) => oldList.indexOf(item) === -1 && add.push(item));

  return { add, remove };
}

function unique(arr) {
  if (arr.length === 0) {
    return arr;
  }

  const isObjArray = arr[0] instanceof Object;
  arr = isObjArray ? arr.map((e) => JSON.stringify(e)) : arr;

  const unique = arr.filter((e, pos) => arr.indexOf(e) === pos);

  return isObjArray ? unique.map((e) => JSON.parse(e)) : unique;
}

function flatten(arr) {
  return [].concat.apply([], arr);
}

function getCaseInsensitiveStringSorter() {
  return (a, b) => {
    const strA = a.toLowerCase();
    const strB = b.toLowerCase();
    if (strA < strB) {
      return -1;
    }
    if (strA > strB) {
      return 1;
    }
    return 0;
  };
}

module.exports = {
  diff,
  unique,
  flatten,
  getCaseInsensitiveStringSorter,
};
